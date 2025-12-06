'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { FiFlag, FiAlertTriangle, FiCheck, FiLoader } from 'react-icons/fi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { createPostReport, type ReportReason } from '@/app/actions/reports';
import { cn } from '@/lib/utils';

interface ReportPostDialogProps {
  postId: number;
  postName?: string;
  trigger?: React.ReactNode;
  onReported?: () => void;
}

const REPORT_REASONS: { value: ReportReason; labelKey: string; icon: string }[] = [
  { value: 'spam', labelKey: 'spam', icon: '🚫' },
  { value: 'inappropriate', labelKey: 'inappropriate', icon: '⚠️' },
  { value: 'misleading', labelKey: 'misleading', icon: '🎭' },
  { value: 'expired', labelKey: 'expired', icon: '⏰' },
  { value: 'wrong_location', labelKey: 'wrongLocation', icon: '📍' },
  { value: 'safety_concern', labelKey: 'safetyConcern', icon: '🛡️' },
  { value: 'duplicate', labelKey: 'duplicate', icon: '📋' },
  { value: 'other', labelKey: 'other', icon: '❓' },
];

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  const t = useTranslations('Reports');

  return (
    <Button type="submit" disabled={disabled || pending} className="min-w-[120px]">
      {pending ? (
        <>
          <FiLoader className="mr-2 h-4 w-4 animate-spin" />
          {t('submitting')}
        </>
      ) : (
        <>
          <FiFlag className="mr-2 h-4 w-4" />
          {t('submitReport')}
        </>
      )}
    </Button>
  );
}

export function ReportPostDialog({
  postId,
  postName,
  trigger,
  onReported,
}: ReportPostDialogProps) {
  const t = useTranslations('Reports');
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;

    setStatus('idle');
    setErrorMessage('');

    const result = await createPostReport({
      post_id: postId,
      reason,
      description: description.trim() || undefined,
    });

    if (result.success) {
      setStatus('success');
      setTimeout(() => {
        setOpen(false);
        setReason('');
        setDescription('');
        setStatus('idle');
        onReported?.();
      }, 2000);
    } else {
      setStatus('error');
      setErrorMessage(result.error?.message || t('submitError'));
    }
  };

  const resetForm = () => {
    setReason('');
    setDescription('');
    setStatus('idle');
    setErrorMessage('');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <FiFlag className="mr-2 h-4 w-4" />
            {t('report')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FiAlertTriangle className="h-5 w-5 text-amber-500" />
            {t('reportPost')}
          </DialogTitle>
          <DialogDescription>
            {postName ? t('reportPostDescription', { name: postName }) : t('reportPostDescriptionGeneric')}
          </DialogDescription>
        </DialogHeader>

        {status === 'success' ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 rounded-full bg-green-100 p-3 dark:bg-green-900/30">
              <FiCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">{t('reportSubmitted')}</h3>
            <p className="text-sm text-muted-foreground">{t('reportSubmittedDescription')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <Label>{t('selectReason')}</Label>
              <RadioGroup
                value={reason}
                onValueChange={(value) => setReason(value as ReportReason)}
                className="grid grid-cols-2 gap-2"
              >
                {REPORT_REASONS.map((item) => (
                  <div key={item.value}>
                    <RadioGroupItem
                      value={item.value}
                      id={item.value}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={item.value}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-lg border-2 border-muted p-3 transition-colors',
                        'hover:bg-accent hover:text-accent-foreground',
                        'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5'
                      )}
                    >
                      <span>{item.icon}</span>
                      <span className="text-sm">{t(`reasons.${item.labelKey}`)}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('additionalDetails')}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('additionalDetailsPlaceholder')}
                rows={3}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground">
                {description.length}/1000
              </p>
            </div>

            {status === 'error' && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {errorMessage}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                {t('cancel')}
              </Button>
              <SubmitButton disabled={!reason} />
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
