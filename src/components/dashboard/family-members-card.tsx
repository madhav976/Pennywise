'use client';

import React, { useState } from 'react';
import { User, Users, Plus, Check } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  avatarUrl?: string;
  role?: string;
}

interface FamilyMembersCardProps {
  members?: Member[];
  activeMemberId?: string;
  onSelectMember?: (memberId: string) => void;
  onSwitchAccount?: () => void;
}

export function FamilyMembersCard({
  members = [
    { id: 'm-1', name: 'Jason', role: 'Primary' },
    { id: 'm-2', name: 'Sarah', role: 'Partner' },
    { id: 'm-3', name: 'Mike', role: 'Dependent' },
  ],
  activeMemberId = 'm-1',
  onSelectMember,
  onSwitchAccount,
}: FamilyMembersCardProps) {
  const [selectedId, setSelectedId] = useState(activeMemberId);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    onSelectMember?.(id);
  };

  return (
    <div className="bg-card border border-border rounded-3xl p-6 shadow-subtle-elevation">
      {/* Header and Switch Account Action */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold tracking-tight text-text-primary">Family members</h2>
        <button
          onClick={onSwitchAccount}
          className="px-3.5 py-1.5 rounded-full bg-card-secondary border border-white/5 hover:border-white/10 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
        >
          Switch account
        </button>
      </div>

      {/* Member Avatars Row */}
      <div className="flex items-center gap-6">
        {members.map((member) => {
          const isSelected = selectedId === member.id;

          return (
            <div
              key={member.id}
              onClick={() => handleSelect(member.id)}
              className="flex flex-col items-center cursor-pointer group"
            >
              <div
                className={`w-14 h-14 rounded-full p-0.5 transition-all duration-200 ${
                  isSelected
                    ? 'ring-2 ring-accent-primary ring-offset-2 ring-offset-card shadow-card-glow'
                    : 'border border-white/10 group-hover:border-accent-primary/40'
                }`}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-card-secondary flex items-center justify-center relative">
                  {member.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.avatarUrl}
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-purple-900/50 to-accent-secondary/30 flex items-center justify-center font-bold text-sm text-accent-primary">
                      {member.name.slice(0, 1)}
                    </div>
                  )}

                  {isSelected && (
                    <div className="absolute inset-0 bg-accent-secondary/10 flex items-center justify-center">
                      <div className="w-3.5 h-3.5 rounded-full bg-accent-primary flex items-center justify-center shadow-sm">
                        <Check className="w-2.5 h-2.5 text-background" strokeWidth={3} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <span
                className={`mt-2 text-xs font-medium transition-colors ${
                  isSelected
                    ? 'text-text-primary font-semibold'
                    : 'text-text-secondary group-hover:text-text-primary'
                }`}
              >
                {member.name}
              </span>
            </div>
          );
        })}

        {/* Add Member Shortcut */}
        <button
          onClick={onSwitchAccount}
          aria-label="Add Member"
          className="flex flex-col items-center group cursor-pointer"
        >
          <div className="w-14 h-14 rounded-full border border-dashed border-white/15 hover:border-accent-primary/50 flex items-center justify-center bg-card-secondary/40 text-text-muted hover:text-accent-primary transition-colors">
            <Plus className="w-5 h-5" />
          </div>
          <span className="mt-2 text-xs font-medium text-text-muted group-hover:text-accent-primary transition-colors">
            Add
          </span>
        </button>
      </div>
    </div>
  );
}

