'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePennywise } from '@/context/pennywise-context';
import {
  EXPENSE_CATEGORIES,
  ExpenseCategoryName,
  INCOME_CATEGORIES,
  ReceiptItemInput,
  ScannedReceiptExtraction,
  TransactionCategoryName,
  TransactionType,
} from '@/types/pennywise';
import { getCategoryMeta } from '@/lib/categories';
import {
  categorizeExpenseByMerchantAndItems,
  SAMPLE_RECEIPT_TEXTS,
} from '@/lib/receipt-intelligence';
import {
  buildCameraConstraints,
  CameraErrorInfo,
  CameraFacingMode,
  classifyCameraError,
  setCameraTorch,
  stopMediaStreamTracks,
  supportsCameraTorch,
} from '@/lib/camera-utils';
import { formatCurrency, roundMoney } from '@/lib/money';
import { MobileBottomSheet, PwIcon, PwSpinner } from '@/components/ui/pw-icon';
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  Check,
  Eye,
  EyeOff,
  Flashlight,
  PenLine,
  Plus,
  RefreshCw,
  Sparkles,
  SwitchCamera,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

export function AddExpenseSheet() {
  const {
    user,
    accounts,
    isAddExpenseSheetOpen,
    activeAddMode,
    openAddFlow,
    closeAddFlow,
    addTransaction,
    createAccount,
    isReceiptHashDuplicate,
  } = usePennywise();

  const currency = user?.currency || 'INR';

  // Scanning states
  const [isScanning, setIsScanning] = useState(false);
  const [scanStageText, setScanStageText] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<ScannedReceiptExtraction | null>(null);

  // Live Device Camera states (MediaDevices.getUserMedia)
  const [isCameraViewOpen, setIsCameraViewOpen] = useState(true);
  const [isCameraInitializing, setIsCameraInitializing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] =
    useState<CameraFacingMode>('environment');
  const [cameraError, setCameraError] = useState<CameraErrorInfo | null>(null);
  const [hasTorchSupport, setHasTorchSupport] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [canSwitchCamera, setCanSwitchCamera] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Form states (shared by Receipt Review & Manual Entry)
  const [txType, setTxType] = useState<TransactionType>('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [taxAmount, setTaxAmount] = useState('');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<TransactionCategoryName>('Food & Dining');
  const [categoryReasoning, setCategoryReasoning] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('UPI');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [isReceiptImageExpanded, setIsReceiptImageExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ReceiptItemInput[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Quick inline account creation if user has 0 accounts yet
  const [quickAccName, setQuickAccName] = useState('Salary Account');
  const [quickAccBalance, setQuickAccBalance] = useState('50000');
  const [isCreatingQuickAcc, setIsCreatingQuickAcc] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Ensure default account is selected when accounts exist
  const effectiveAccountId =
    selectedAccountId && accounts.some((a) => a.id === selectedAccountId)
      ? selectedAccountId
      : accounts[0]?.id || '';

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      stopMediaStreamTracks(streamRef.current);
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
    setIsCameraInitializing(false);
    setHasTorchSupport(false);
    setIsTorchOn(false);
  }, []);

  const startCameraStream = useCallback(
    async (mode: CameraFacingMode = cameraFacingMode) => {
      stopCamera();
      setCameraError(null);
      setScanError(null);
      setIsCameraViewOpen(true);
      setIsCameraInitializing(true);
      setIsCameraReady(false);

      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== 'function'
      ) {
        setIsCameraInitializing(false);
        setCameraError(classifyCameraError({ name: 'UnsupportedContextError' }));
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia(
          buildCameraConstraints(mode)
        );
        streamRef.current = stream;

        // Detect torch support
        setHasTorchSupport(supportsCameraTorch(stream));

        // Detect whether device has multiple cameras or is mobile
        try {
          if (typeof navigator.mediaDevices.enumerateDevices === 'function') {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoInputs = devices.filter((d) => d.kind === 'videoinput');
            const isMobileUA =
              typeof navigator.userAgent === 'string' &&
              /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
            setCanSwitchCamera(videoInputs.length > 1 || isMobileUA);
          }
        } catch {
          setCanSwitchCamera(true);
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch {
            // AutoPlay handled via muted + playsInline attributes
          }
        }
        setIsCameraReady(true);
        setIsCameraInitializing(false);
      } catch (err) {
        stopCamera();
        setCameraError(classifyCameraError(err));
      }
    },
    [cameraFacingMode, stopCamera]
  );

  // Activate camera ONLY when the user explicitly opens Scan Receipt mode
  useEffect(() => {
    const shouldActivateCamera =
      isAddExpenseSheetOpen &&
      activeAddMode === 'scan' &&
      !extraction &&
      !isScanning &&
      isCameraViewOpen;

    if (shouldActivateCamera) {
      startCameraStream(cameraFacingMode);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [
    isAddExpenseSheetOpen,
    activeAddMode,
    extraction,
    isScanning,
    isCameraViewOpen,
    cameraFacingMode,
    startCameraStream,
    stopCamera,
  ]);

  async function handleSwitchCamera() {
    const nextMode: CameraFacingMode =
      cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextMode);
  }

  async function handleToggleTorch() {
    if (!streamRef.current) return;
    const nextTorch = !isTorchOn;
    const applied = await setCameraTorch(streamRef.current, nextTorch);
    if (applied) {
      setIsTorchOn(nextTorch);
    }
  }

  async function handleCaptureCameraFrame() {
    const videoEl = videoRef.current;
    if (!videoEl || !isCameraReady) return;

    const width = videoEl.videoWidth || 1280;
    const height = videoEl.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoEl, 0, 0, width, height);

    // Stop camera tracks immediately upon capture so camera does not stay active
    stopCamera();

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setScanError('Could not capture photo from camera. Please try again.');
          return;
        }
        const capturedFile = new File(
          [blob],
          `pennywise-receipt-${Date.now()}.jpg`,
          { type: 'image/jpeg' }
        );
        processUploadedFile(capturedFile);
      },
      'image/jpeg',
      0.92
    );
  }

  function resetFormState() {
    stopCamera();
    setIsCameraViewOpen(true);
    setCameraError(null);
    setIsScanning(false);
    setScanStageText('');
    setScanError(null);
    setPreviewImageUrl(null);
    setExtraction(null);
    setTxType('expense');
    setTitle('');
    setAmount('');
    setTaxAmount('');
    setTxDate(new Date().toISOString().slice(0, 10));
    setCategory('Food & Dining');
    setCategoryReasoning('');
    setSelectedAccountId(accounts[0]?.id || '');
    setPaymentMethod('UPI');
    setInvoiceNumber('');
    setIsReceiptImageExpanded(false);
    setNotes('');
    setItems([]);
    setFormError(null);
  }

  function handleClose() {
    stopCamera();
    resetFormState();
    closeAddFlow();
  }

  function populateFromExtraction(
    data: ScannedReceiptExtraction,
    previewUrl?: string
  ) {
    setExtraction(data);
    if (previewUrl) {
      setPreviewImageUrl(previewUrl);
    }
    setTxType('expense');
    setTitle(data.merchantName || '');
    setAmount(data.totalAmount > 0 ? String(data.totalAmount) : '');
    setTaxAmount(data.taxAmount !== undefined ? String(data.taxAmount) : '');
    setTxDate(data.transactionDate || new Date().toISOString().slice(0, 10));
    setCategory(data.suggestedCategory || 'Other');
    setCategoryReasoning(data.categoryReasoning || '');
    setPaymentMethod(data.paymentMethod || 'UPI');
    setInvoiceNumber(data.invoiceNumber || '');
    setItems(data.items || []);
    setSelectedAccountId(accounts[0]?.id || '');
    setFormError(null);
  }

  async function processUploadedFile(file: File) {
    setScanError(null);
    setFormError(null);

    if (!file.type.startsWith('image/')) {
      setScanError(
        'Unsupported file format. Please select a valid JPEG, PNG, or WEBP receipt image.'
      );
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setScanError('Image exceeds 10MB limit. Please upload a smaller receipt image.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewImageUrl(objectUrl);
    setIsScanning(true);
    setScanStageText('Analyzing receipt with Gemini Multimodal Vision AI...');

    try {
      const formData = new FormData();
      formData.append('receipt', file);

      const res = await fetch('/api/receipts/scan', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to process receipt.');
      }

      const data: ScannedReceiptExtraction = json.data;
      if (isReceiptHashDuplicate(data.receiptHash)) {
        data.isDuplicateWarning = true;
      }

      populateFromExtraction(data, objectUrl);
    } catch (err: any) {
      setScanError(
        err?.message ||
          'Could not extract receipt data automatically. You can enter the details manually.'
      );
    } finally {
      setIsScanning(false);
      setScanStageText('');
    }
  }

  async function handleSampleReceiptScan(presetKey: string) {
    const preset = SAMPLE_RECEIPT_TEXTS[presetKey];
    if (!preset) return;

    setScanError(null);
    setFormError(null);
    setPreviewImageUrl(null);
    setIsScanning(true);
    setScanStageText(`Scanning ${preset.label} with AI...`);

    try {
      const res = await fetch('/api/receipts/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Add timestamp salt only for sample test presets so reviewers can test scanning multiple times if desired
          ocrText: `${preset.rawText}\nRef: ${Date.now()}`,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to scan sample receipt.');
      }
      populateFromExtraction(json.data);
    } catch (err: any) {
      setScanError(err?.message || 'Failed to scan receipt.');
    } finally {
      setIsScanning(false);
      setScanStageText('');
    }
  }

  function handleReanalyzeCategory() {
    const result = categorizeExpenseByMerchantAndItems(title, items);
    setCategory(result.category);
    setCategoryReasoning(result.reasoning);
  }

  function handleAddEmptyItem() {
    setItems((prev) => [
      ...prev,
      { name: '', quantity: 1, unitPrice: 0, totalPrice: 0 },
    ]);
  }

  function handleUpdateItem(
    index: number,
    field: keyof ReceiptItemInput,
    value: string
  ) {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[index] };
      if (field === 'name') {
        item.name = value;
      } else if (field === 'quantity') {
        const q = parseFloat(value) || 1;
        item.quantity = q;
        item.totalPrice = roundMoney(q * item.unitPrice);
      } else if (field === 'totalPrice') {
        const tp = parseFloat(value) || 0;
        item.totalPrice = tp;
        item.unitPrice = roundMoney(tp / (item.quantity || 1));
      }
      next[index] = item;
      return next;
    });
  }

  function handleRemoveItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSyncTotalFromItems() {
    const itemsSum = items.reduce((acc, i) => acc + (Number(i.totalPrice) || 0), 0);
    const taxVal = parseFloat(taxAmount) || 0;
    const syncedTotal = roundMoney(itemsSum + taxVal);
    if (syncedTotal > 0) {
      setAmount(String(syncedTotal));
    }
  }

  async function handleCreateFirstAccountInline() {
    if (isCreatingQuickAcc) return;
    setFormError(null);
    const bal = parseFloat(quickAccBalance);
    if (!quickAccName.trim() || isNaN(bal) || bal < 0) {
      setFormError('Please enter a valid account name and opening balance.');
      return;
    }
    setIsCreatingQuickAcc(true);
    try {
      const res = await createAccount({
        name: quickAccName.trim(),
        accountType: 'salary',
        openingBalance: bal,
        icon: 'Landmark',
        description: 'Primary account',
      });
      if (res.ok && res.account) {
        setSelectedAccountId(res.account.id);
      } else {
        setFormError(res.error || 'Could not create account.');
      }
    } finally {
      setIsCreatingQuickAcc(false);
    }
  }

  async function handleSubmitTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (isSaving) return;
    setFormError(null);

    if (!effectiveAccountId) {
      setFormError(
        'Every transaction must be associated with a selected account. Please select or create an account.'
      );
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid amount greater than 0.');
      return;
    }

    if (!title.trim()) {
      setFormError('Please enter a merchant or expense title.');
      return;
    }

    const parsedTax = taxAmount ? parseFloat(taxAmount) : undefined;
    const validItems = items.filter(
      (i) => i.name.trim().length > 0 && i.totalPrice >= 0
    );

    setIsSaving(true);
    try {
      const res = await addTransaction({
        accountId: effectiveAccountId,
        title: title.trim(),
        amount: roundMoney(parsedAmount),
        transactionType: txType,
        category,
        transactionDate: txDate,
        taxAmount: parsedTax !== undefined && !isNaN(parsedTax) ? parsedTax : undefined,
        notes: notes.trim() || undefined,
        receipt: extraction
          ? {
              merchantName: title.trim(),
              receiptDate: txDate,
              totalAmount: roundMoney(parsedAmount),
              taxAmount:
                parsedTax !== undefined && !isNaN(parsedTax) ? parsedTax : undefined,
              suggestedCategory: category as ExpenseCategoryName,
              receiptHash: extraction.receiptHash,
              rawOcrText: extraction.rawText,
              items: validItems,
            }
          : undefined,
      });

      if (!res.ok) {
        setFormError(res.error || 'Failed to save transaction.');
        return;
      }

      handleClose();
    } finally {
      setIsSaving(false);
    }
  }

  // Determine modal title
  const sheetTitle =
    activeAddMode === 'chooser'
      ? 'Add Expense'
      : activeAddMode === 'scan' && !extraction
      ? 'AI Receipt Scanner'
      : extraction
      ? 'Review Scanned Receipt'
      : 'Manual Entry';

  const sheetSubtitle =
    activeAddMode === 'chooser'
      ? 'Scan a physical receipt or log a transaction manually'
      : activeAddMode === 'scan' && !extraction
      ? 'Upload or capture a receipt for instant AI extraction'
      : extraction
      ? 'Verify extracted items, category, and account before saving'
      : 'Record an expense or income to your selected account';

  const availableCategories =
    txType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <MobileBottomSheet
      isOpen={isAddExpenseSheetOpen}
      onClose={handleClose}
      title={sheetTitle}
      subtitle={sheetSubtitle}
    >
      {/* STEP 1: ACTION CHOOSER */}
      {activeAddMode === 'chooser' && (
        <div className="space-y-3 animate-viewEnter">
          <button
            type="button"
            onClick={() => {
              resetFormState();
              openAddFlow('scan');
            }}
            className="w-full p-4 rounded-[24px] bg-[#DFFF52] border border-[#CBEB3B] text-left flex items-center justify-between group active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#191B19] text-[#DFFF52] flex items-center justify-center shrink-0">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-[#191B19]">
                    Scan Receipt
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#191B19] text-[#DFFF52] text-[10px] font-semibold">
                    AI OCR
                  </span>
                </div>
                <p className="text-xs text-[#191B19]/75 mt-0.5">
                  Capture or upload a receipt to extract items & auto-categorize
                </p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              resetFormState();
              openAddFlow('manual');
            }}
            className="w-full p-4 rounded-[24px] bg-white border border-[#E7EBE5] shadow-pw-card text-left flex items-center justify-between active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#EBF0E9] text-[#191B19] flex items-center justify-center shrink-0">
                <PenLine className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-semibold text-[#191B19] block">
                  Add Manually
                </span>
                <p className="text-xs text-[#777F77] mt-0.5">
                  Enter an expense or income with custom category & notes
                </p>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* STEP 2A: LIVE CAMERA ACTIVATION & RECEIPT UPLOAD */}
      {activeAddMode === 'scan' && !extraction && (
        <div className="space-y-4 animate-viewEnter">
          {/* Hidden file inputs for Fallback Native Camera and Device Upload */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processUploadedFile(file);
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processUploadedFile(file);
            }}
          />

          {scanError && (
            <div className="p-3.5 rounded-2xl bg-[#FFEFEF] border border-[#F5C2C7] text-xs text-[#B42318] flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <p className="font-medium">{scanError}</p>
                <button
                  type="button"
                  onClick={() => openAddFlow('manual')}
                  className="underline font-semibold"
                >
                  Switch to manual entry →
                </button>
              </div>
            </div>
          )}

          {isScanning ? (
            <div
              className="py-8 px-5 rounded-[28px] bg-white border border-[#E7EBE5] shadow-pw-card text-center space-y-4 animate-viewEnter"
              aria-live="polite"
              aria-busy="true"
            >
              {previewImageUrl && (
                <div className="w-28 h-36 mx-auto rounded-2xl overflow-hidden border border-[#E7EBE5] relative shadow-sm">
                  <img
                    src={previewImageUrl}
                    alt="Receipt preview"
                    className="w-full h-full object-cover opacity-85"
                  />
                  <div className="absolute inset-x-2 h-0.5 bg-[#DFFF52] shadow-[0_0_8px_#DFFF52] animate-cameraScanSweep" />
                </div>
              )}
              <div className="w-12 h-12 rounded-2xl bg-[#DFFF52] mx-auto flex items-center justify-center text-[#191B19]">
                <PwSpinner className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[#191B19]">
                  Analyzing your receipt...
                </p>
                <p className="text-xs text-[#777F77]">
                  {scanStageText || 'Extracting merchant, items, and suggested category...'}
                </p>
              </div>
              <div className="flex items-center justify-center gap-1.5 pt-1">
                <span className="w-2 h-2 rounded-full bg-[#191B19] animate-pulse" />
                <span className="text-[11px] font-medium text-[#777F77]">
                  AI OCR & line-item classification in progress
                </span>
              </div>
            </div>
          ) : (
            <>
              {/* Live Camera Viewfinder Card (Pennywise Light-Themed Visual Identity) */}
              {isCameraViewOpen && (
                <div className="rounded-[28px] bg-white border border-[#E7EBE5] shadow-pw-card overflow-hidden animate-viewEnter">
                  {/* Camera Header Bar */}
                  <div className="px-4 py-3 bg-[#F5F7F3] border-b border-[#E7EBE5] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        stopCamera();
                        openAddFlow('chooser');
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#E7EBE5] text-xs font-semibold text-[#191B19] active:scale-95 transition-transform"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>

                    <span className="text-xs font-semibold text-[#191B19] flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isCameraReady
                            ? 'bg-[#2E7D32]'
                            : isCameraInitializing
                            ? 'bg-[#D97706] animate-pulse'
                            : 'bg-[#777F77]'
                        }`}
                      />
                      {isCameraInitializing
                        ? 'Initializing camera...'
                        : isCameraReady
                        ? 'Live Receipt Scanner'
                        : 'Camera Permission'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {hasTorchSupport && isCameraReady && (
                        <button
                          type="button"
                          onClick={handleToggleTorch}
                          aria-label="Toggle flash"
                          className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                            isTorchOn
                              ? 'bg-[#DFFF52] border-[#CBEB3B] text-[#191B19]'
                              : 'bg-white border-[#E7EBE5] text-[#191B19]'
                          }`}
                        >
                          <Flashlight className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canSwitchCamera && isCameraReady && (
                        <button
                          type="button"
                          onClick={handleSwitchCamera}
                          aria-label="Switch camera"
                          className="w-8 h-8 rounded-full bg-white border border-[#E7EBE5] flex items-center justify-center text-[#191B19] active:scale-95 transition-transform"
                        >
                          <SwitchCamera className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Camera Viewport or Permission Error State */}
                  {cameraError ? (
                    <div className="p-5 space-y-3.5 text-center bg-white animate-fadeIn">
                      <div className="w-12 h-12 rounded-2xl bg-[#EBF0E9] text-[#191B19] mx-auto flex items-center justify-center">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold text-[#191B19]">
                          {cameraError.title}
                        </h4>
                        <p className="text-xs text-[#777F77] leading-relaxed">
                          {cameraError.message}
                        </p>
                      </div>

                      <div className="p-3 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-left">
                        <p className="text-[11px] font-semibold text-[#191B19]">
                          How to enable camera access:
                        </p>
                        <p className="text-[11px] text-[#777F77] mt-0.5 leading-relaxed">
                          {cameraError.browserSettingsHint}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => startCameraStream(cameraFacingMode)}
                          className="py-2.5 px-3 rounded-full bg-[#191B19] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-[#DFFF52]" />
                          <span>Try Again</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="py-2.5 px-3 rounded-full bg-[#DFFF52] border border-[#CBEB3B] text-[#191B19] text-xs font-semibold inline-flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Image</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative w-full h-64 bg-[#191B19] overflow-hidden flex items-center justify-center">
                      {/* Live HTML5 Video Element */}
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        onLoadedMetadata={() => {
                          setIsCameraReady(true);
                          setIsCameraInitializing(false);
                        }}
                        className={`w-full h-full object-cover transition-opacity duration-200 ${
                          isCameraReady ? 'opacity-100' : 'opacity-0'
                        }`}
                      />

                      {/* Subtle Camera Initialization Overlay */}
                      {isCameraInitializing && (
                        <div className="absolute inset-0 bg-[#F5F7F3] flex flex-col items-center justify-center p-6 text-center space-y-3 animate-fadeIn">
                          <div className="w-12 h-12 rounded-2xl bg-[#DFFF52] text-[#191B19] flex items-center justify-center shadow-sm">
                            <PwSpinner className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-[#191B19]">
                              Initializing camera...
                            </p>
                            <p className="text-[11px] text-[#777F77] mt-0.5">
                              Preparing rear lens for receipt capture
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Subtle Receipt Positioning Guidance Overlay */}
                      {isCameraReady && (
                        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 animate-fadeIn">
                          <div className="relative flex-1 border border-white/25 rounded-2xl overflow-hidden">
                            {/* Corner Guide Brackets */}
                            <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-[#DFFF52] rounded-tl-md" />
                            <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-[#DFFF52] rounded-tr-md" />
                            <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-[#DFFF52] rounded-bl-md" />
                            <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-[#DFFF52] rounded-br-md" />
                            {/* Subtle Scanning Guide Sweep */}
                            <div className="absolute inset-x-4 h-0.5 bg-[#DFFF52]/70 animate-cameraScanSweep" />
                          </div>
                          <div className="mt-2 flex justify-center">
                            <span className="px-3 py-1 rounded-full bg-[#191B19]/80 text-white text-[10px] font-medium backdrop-blur-sm">
                              Position receipt edges inside the guide frame
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Camera Action Footer when stream is active */}
                  {!cameraError && (
                    <div className="p-3.5 bg-[#F5F7F3] border-t border-[#E7EBE5] flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-2 rounded-full bg-white border border-[#E7EBE5] text-xs font-semibold text-[#191B19] inline-flex items-center gap-1.5 active:scale-95 transition-transform"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCaptureCameraFrame}
                        disabled={!isCameraReady}
                        aria-label="Capture receipt photo"
                        className="px-5 py-2.5 rounded-full bg-[#191B19] text-white text-xs font-semibold inline-flex items-center gap-2 shadow-pw-card active:scale-95 transition-all disabled:opacity-50"
                      >
                        <span className="w-3 h-3 rounded-full bg-[#DFFF52]" />
                        <span>Capture Receipt</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openAddFlow('manual')}
                        className="px-3.5 py-2 rounded-full bg-white border border-[#E7EBE5] text-xs font-semibold text-[#191B19] inline-flex items-center gap-1.5 active:scale-95 transition-transform"
                      >
                        <PenLine className="w-3.5 h-3.5" />
                        <span>Manual</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (cameraError) {
                      cameraInputRef.current?.click();
                    } else {
                      startCameraStream(cameraFacingMode);
                    }
                  }}
                  className="p-4 rounded-[24px] bg-[#191B19] text-white flex flex-col items-center justify-center text-center gap-2 active:scale-95 transition-transform"
                >
                  <div className="w-10 h-10 rounded-2xl bg-[#DFFF52] text-[#191B19] flex items-center justify-center">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Mobile Camera</p>
                    <p className="text-[10px] text-white/70 mt-0.5">
                      Snap physical receipt
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 rounded-[24px] bg-white border border-[#E7EBE5] text-[#191B19] flex flex-col items-center justify-center text-center gap-2 active:scale-95 transition-transform"
                >
                  <div className="w-10 h-10 rounded-2xl bg-[#EBF0E9] text-[#191B19] flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Upload Image</p>
                    <p className="text-[10px] text-[#777F77] mt-0.5">
                      JPG, PNG, WEBP
                    </p>
                  </div>
                </button>
              </div>

              {/* Sample Receipts for Quick Verification */}
              <div className="bg-[#EBF0E9] rounded-[24px] p-4 border border-[#E7EBE5] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#191B19] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Test AI Scanner with Sample Receipts
                  </span>
                  <span className="text-[10px] text-[#777F77]">Instant OCR Demo</span>
                </div>
                <p className="text-[11px] text-[#777F77]">
                  Testing without a paper receipt handy? Select a sample receipt below to inspect the AI item extraction and review screen:
                </p>
                <div className="space-y-2 pt-1">
                  {Object.entries(SAMPLE_RECEIPT_TEXTS).map(([key, item]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSampleReceiptScan(key)}
                      className="w-full p-2.5 rounded-2xl bg-white border border-[#E7EBE5] text-left flex items-center justify-between hover:border-[#191B19] transition-colors"
                    >
                      <div>
                        <p className="text-xs font-semibold text-[#191B19]">
                          {item.label}
                        </p>
                        <p className="text-[10px] text-[#777F77]">{item.subtitle}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-[#DFFF52] text-[#191B19] text-[10px] font-semibold">
                        Scan
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* STEP 2B & STEP 3: RECEIPT REVIEW SCREEN OR MANUAL ENTRY FORM */}
      {(activeAddMode === 'manual' || Boolean(extraction)) && (
        <form onSubmit={handleSubmitTransaction} className="space-y-4 animate-viewEnter">
          {/* Expanded Receipt Image Lightbox Modal */}
          {isReceiptImageExpanded && previewImageUrl && (
            <div className="fixed inset-0 z-[120] bg-black/85 flex flex-col items-center justify-center p-4 animate-fadeIn">
              <div className="relative max-w-sm w-full max-h-[85vh] flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => setIsReceiptImageExpanded(false)}
                  className="absolute -top-11 right-0 p-2 rounded-full bg-white/20 text-white hover:bg-white/30 active:scale-95 transition-transform"
                  aria-label="Close image preview"
                >
                  <X className="w-5 h-5" />
                </button>
                <img
                  src={previewImageUrl}
                  alt="Expanded receipt preview"
                  className="max-h-[80vh] w-auto object-contain rounded-2xl border border-white/20 shadow-2xl"
                />
              </div>
            </div>
          )}

          {/* Receipt Extraction Top Section */}
          {extraction && (
            <div className="space-y-3">
              {/* Receipt Image Thumbnail Banner */}
              {previewImageUrl && (
                <div className="bg-white rounded-[24px] p-3 border border-[#E7EBE5] flex items-center justify-between gap-3 shadow-pw-card">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => setIsReceiptImageExpanded(true)}
                      className="w-14 h-16 rounded-2xl overflow-hidden border border-[#E7EBE5] relative shrink-0 shadow-sm group active:scale-95 transition-transform"
                    >
                      <img
                        src={previewImageUrl}
                        alt="Receipt thumbnail"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="w-4 h-4 text-white" />
                      </div>
                    </button>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#191B19] truncate">
                        Receipt Image Attached
                      </p>
                      <p className="text-[10px] text-[#777F77] mt-0.5">
                        Tap photo to zoom & verify details
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {extraction.confidence && (
                      <span className="px-2.5 py-1 rounded-full bg-[#EBF0E9] text-[#191B19] text-[10px] font-semibold border border-[#D8DFD4]">
                        {Math.round(extraction.confidence.totalAmount * 100)}% match
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setExtraction(null)}
                      className="text-[11px] font-semibold text-[#191B19] underline"
                    >
                      Rescan
                    </button>
                  </div>
                </div>
              )}

              {/* Extraction Review Needed Banner */}
              {extraction.needsReview && (
                <div className="p-3.5 rounded-2xl bg-[#FFF6ED] border border-[#F5D0A9] text-xs text-[#9A4D06] flex items-start gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">Review & Confirmation Required</p>
                    <p className="text-[11px] leading-relaxed text-[#9A4D06]/90">
                      {extraction.warnings?.[0] ||
                        extraction.qualityWarning ||
                        'Please verify the final amount and items before confirming.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Duplicate Receipt Warning */}
              {extraction.isDuplicateWarning && (
                <div className="p-3 rounded-2xl bg-[#FFEFEF] border border-[#F5C2C7] text-xs text-[#B42318] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Warning: A receipt with this exact image signature has already been recorded.
                  </span>
                </div>
              )}

              {/* PROMINENT FINAL PAYABLE AMOUNT CARD */}
              <div className="bg-[#191B19] text-white rounded-[24px] p-4.5 border border-[#191B19] shadow-pw-card space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/70 font-medium">Final Payable Amount</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#DFFF52] text-[#191B19] text-[10px] font-bold uppercase tracking-wider">
                    {currency}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-[#DFFF52] tracking-tight">
                    {formatCurrency(parseFloat(amount) || 0, currency)}
                  </span>
                </div>
                {(extraction.subtotal || extraction.discount || extraction.taxAmount) && (
                  <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/75">
                    {extraction.subtotal !== undefined && (
                      <span>Subtotal: {formatCurrency(extraction.subtotal, currency)}</span>
                    )}
                    {extraction.discount !== undefined && extraction.discount > 0 && (
                      <span className="text-[#DFFF52]">
                        Discount: -{formatCurrency(extraction.discount, currency)}
                      </span>
                    )}
                    {extraction.taxAmount !== undefined && extraction.taxAmount > 0 && (
                      <span>Tax/GST: +{formatCurrency(extraction.taxAmount, currency)}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Expense / Income Toggle (only in Manual Mode) */}
          {!extraction && (
            <div className="flex items-center gap-2 bg-[#EBF0E9] p-1.5 rounded-full border border-[#E7EBE5]">
              <button
                type="button"
                onClick={() => {
                  setTxType('expense');
                  setCategory('Food & Dining');
                }}
                className={`flex-1 py-2 rounded-full text-xs font-semibold transition-all ${
                  txType === 'expense'
                    ? 'bg-[#191B19] text-white'
                    : 'text-[#777F77]'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => {
                  setTxType('income');
                  setCategory('Salary');
                }}
                className={`flex-1 py-2 rounded-full text-xs font-semibold transition-all ${
                  txType === 'income'
                    ? 'bg-[#191B19] text-white'
                    : 'text-[#777F77]'
                }`}
              >
                Income
              </button>
            </div>
          )}

          {formError && (
            <div className="p-3 rounded-2xl bg-[#FFEFEF] border border-[#F5C2C7] text-xs text-[#B42318] font-medium">
              {formError}
            </div>
          )}

          {/* Mandatory Account Selection */}
          <div className="bg-white rounded-[24px] p-4 border border-[#E7EBE5] space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#191B19]">
                Select Account <span className="text-[#E5484D]">*</span>
              </label>
              <span className="text-[10px] font-medium text-[#777F77]">
                Mandatory for balance tracking
              </span>
            </div>

            {accounts.length === 0 ? (
              <div className="p-3.5 rounded-2xl bg-[#F5F7F3] border border-dashed border-[#CFD7CB] space-y-3">
                <p className="text-xs font-medium text-[#191B19]">
                  Create your first account to record this transaction:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={quickAccName}
                    onChange={(e) => setQuickAccName(e.target.value)}
                    placeholder="Account Name"
                    className="px-3 py-2 rounded-xl bg-white border border-[#E7EBE5] text-xs text-[#191B19]"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={quickAccBalance}
                    onChange={(e) => setQuickAccBalance(e.target.value)}
                    placeholder="Opening Balance"
                    className="px-3 py-2 rounded-xl bg-white border border-[#E7EBE5] text-xs text-[#191B19]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCreateFirstAccountInline}
                  disabled={isCreatingQuickAcc}
                  className="w-full py-2 rounded-full bg-[#191B19] text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isCreatingQuickAcc ? (
                    <>
                      <PwSpinner className="w-3.5 h-3.5 text-[#DFFF52]" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    '+ Create & Select Account'
                  )}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {accounts.map((acc) => {
                  const isSelected = acc.id === effectiveAccountId;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setSelectedAccountId(acc.id)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'bg-[#191B19] border-[#191B19] text-white'
                          : 'bg-[#F5F7F3] border-[#E7EBE5] text-[#191B19]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <PwIcon
                          name={acc.icon}
                          className={`w-4 h-4 ${
                            isSelected ? 'text-[#DFFF52]' : 'text-[#191B19]'
                          }`}
                        />
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-[#DFFF52]" />
                        )}
                      </div>
                      <p className="text-xs font-semibold truncate mt-1.5">
                        {acc.name}
                      </p>
                      <p
                        className={`text-[11px] font-medium ${
                          isSelected ? 'text-white/80' : 'text-[#777F77]'
                        }`}
                      >
                        {formatCurrency(acc.currentBalance, currency)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Core Expense Fields */}
          <div className="bg-white rounded-[24px] p-4 border border-[#E7EBE5] space-y-3.5">
            <div>
              <label className="block text-[11px] font-medium text-[#777F77] mb-1">
                {extraction
                  ? 'Merchant / Store Name'
                  : txType === 'expense'
                  ? 'Expense Title / Merchant'
                  : 'Income Title / Source'}{' '}
                *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  txType === 'expense'
                    ? 'e.g. Reliance Smart, Croma, Blue Tokai'
                    : 'e.g. Monthly Salary'
                }
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-sm font-medium text-[#191B19] focus:outline-none focus:border-[#191B19]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#777F77] mb-1">
                  Total Amount ({currency}) *
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-sm font-semibold text-[#191B19] focus:outline-none focus:border-[#191B19]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#777F77] mb-1">
                  Purchase Date *
                </label>
                <input
                  type="date"
                  required
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-xs font-medium text-[#191B19] focus:outline-none focus:border-[#191B19]"
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-[11px] font-medium text-[#777F77] mb-1.5">
                Payment Method
              </label>
              <div className="flex flex-wrap gap-2">
                {['UPI', 'Card', 'Cash', 'Net Banking', 'Other'].map((pm) => (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => setPaymentMethod(pm)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      paymentMethod === pm
                        ? 'bg-[#191B19] text-white shadow-sm'
                        : 'bg-[#F5F7F3] border border-[#E7EBE5] text-[#191B19] hover:bg-[#EBF0E9]'
                    }`}
                  >
                    {pm}
                  </button>
                ))}
              </div>
            </div>

            {txType === 'expense' && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-[#777F77] mb-1">
                    Tax Amount (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-xs text-[#191B19] focus:outline-none focus:border-[#191B19]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#777F77] mb-1">
                    Invoice # (Optional)
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="e.g. RS-90412"
                    className="w-full px-3 py-2 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-xs text-[#191B19] focus:outline-none focus:border-[#191B19]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Extracted Receipt Line Items (Editable in Review Mode) */}
          {extraction && (
            <div className="bg-white rounded-[24px] p-4 border border-[#E7EBE5] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-[#191B19]">
                    Extracted Purchased Items ({items.length})
                  </h4>
                  <p className="text-[10px] text-[#777F77]">
                    Used by AI to determine the most accurate expense category
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {items.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSyncTotalFromItems}
                      className="px-2.5 py-1 rounded-full bg-[#EBF0E9] text-[#191B19] text-[10px] font-semibold hover:bg-[#DFFF52] transition-colors"
                    >
                      Sync Total
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleAddEmptyItem}
                    className="px-2.5 py-1 rounded-full bg-[#191B19] text-white text-[10px] font-semibold inline-flex items-center gap-1 active:scale-95 transition-transform"
                  >
                    <Plus className="w-3 h-3" /> Item
                  </button>
                </div>
              </div>

              {items.length === 0 ? (
                <p className="text-xs text-[#777F77] italic py-2">
                  No individual items detected. You can add items above or save with the total amount.
                </p>
              ) : (
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-[#F5F7F3] p-2 rounded-2xl border border-[#E7EBE5]"
                    >
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) =>
                          handleUpdateItem(idx, 'name', e.target.value)
                        }
                        placeholder="Item name"
                        className="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl bg-white border border-[#E7EBE5] text-xs text-[#191B19]"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.totalPrice || ''}
                        onChange={(e) =>
                          handleUpdateItem(idx, 'totalPrice', e.target.value)
                        }
                        placeholder="Price"
                        className="w-20 px-2.5 py-1.5 rounded-xl bg-white border border-[#E7EBE5] text-xs font-semibold text-[#191B19]"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        aria-label="Remove item"
                        className="w-7 h-7 rounded-xl bg-white border border-[#E7EBE5] flex items-center justify-center text-[#777F77] hover:text-[#E5484D] active:scale-95 transition-transform"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Category Selector */}
          <div className="bg-white rounded-[24px] p-4 border border-[#E7EBE5] space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#191B19]">
                {extraction ? 'Suggested Category' : 'Category'} *
              </label>
              {extraction && (
                <button
                  type="button"
                  onClick={handleReanalyzeCategory}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#191B19] bg-[#DFFF52] px-2.5 py-1 rounded-full active:scale-95 transition-transform"
                >
                  <RefreshCw className="w-3 h-3" />
                  Re-check Category
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {availableCategories.map((cat) => {
                const meta = getCategoryMeta(cat);
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-[#191B19] border-[#191B19] text-white'
                        : 'bg-[#F5F7F3] border-[#E7EBE5] text-[#191B19]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <PwIcon
                        name={meta.icon}
                        className={`w-4 h-4 ${
                          isSelected ? 'text-[#DFFF52]' : 'text-[#191B19]'
                        }`}
                      />
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-[#DFFF52]" />
                      )}
                    </div>
                    <span className="text-[11px] font-semibold leading-tight truncate">
                      {cat}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Notes */}
          <div className="bg-white rounded-[24px] p-4 border border-[#E7EBE5]">
            <label className="block text-[11px] font-medium text-[#777F77] mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any context or comments..."
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-xs text-[#191B19] focus:outline-none focus:border-[#191B19]"
            />
          </div>

          {/* Prominent Action Button: Confirm & Save Expense */}
          <button
            type="submit"
            disabled={isSaving || accounts.length === 0}
            className="w-full py-4 rounded-full bg-[#191B19] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-pw-elevated active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <PwSpinner className="w-4 h-4 text-[#DFFF52]" />
            ) : (
              <Check className="w-4 h-4 text-[#DFFF52]" />
            )}
            <span>
              {isSaving
                ? 'Saving Expense...'
                : extraction
                ? 'Confirm & Save Expense'
                : txType === 'expense'
                ? 'Save Expense'
                : 'Save Income'}
            </span>
          </button>
        </form>
      )}
    </MobileBottomSheet>
  );
}

