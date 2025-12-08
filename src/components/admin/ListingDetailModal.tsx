'use client';

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAdminStore } from "@/store/zustand";
import { approveListing, rejectListing } from "@/app/actions/admin";
import type { PostStatus } from "@/types/admin.types";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// Type for audit logs (moved from hooks/queries)
export interface AuditLog {
  id: string;
  action: string;
  created_at: string;
  details?: {
    reason?: string;
    admin_notes?: string;
  };
}

interface StatusBadgeProps {
  status: PostStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const badgeClasses = (() => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-orange-100 text-orange-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "flagged":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  })();

  return (
    <span className={`text-sm font-medium px-2.5 py-0.5 rounded ${badgeClasses}`}>
      {status.toUpperCase()}
    </span>
  );
}

interface AuditLogTimelineProps {
  logs: AuditLog[];
}

function AuditLogTimeline({ logs }: AuditLogTimelineProps) {
  if (logs.length === 0) {
    return (
      <p className="text-gray-500 text-center py-4">
        No audit history available
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {logs.map((log) => (
        <div key={log.id} className="p-3 bg-gray-50 rounded-md border-l-4 border-green-400">
          <div className="flex justify-between items-center mb-1">
            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
              {log.action}
            </span>
            <p className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</p>
          </div>
          {log.details?.reason ? <p className="text-sm text-gray-700 mt-2">{String(log.details.reason)}</p> : null}
          {log.details?.admin_notes ? (
            <p className="text-sm text-gray-600 mt-1 italic">Note: {String(log.details.admin_notes)}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

interface ListingDetailModalProps {
  /** Audit logs passed from server */
  auditLogs?: AuditLog[];
  /** Loading state for audit logs */
  isAuditLogsLoading?: boolean;
}

/**
 * ListingDetailModal - Modal for viewing and managing listing details
 * Allows admins to approve, reject, flag, and add notes
 * Receives audit logs as props from Server Component
 */
export function ListingDetailModal({
  auditLogs = [],
  isAuditLogsLoading = false,
}: ListingDetailModalProps) {
  const t = useTranslations();
  const router = useRouter();

  // Zustand for UI state
  const { detailModalOpen: isOpen, selectedListing: listing, closeDetailModal } = useAdminStore();

  // Local state for mutations
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isFlagging, setIsFlagging] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [flaggedReason, setFlaggedReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  const isSubmitting = isApproving || isRejecting || isFlagging;

  // Update admin notes when listing changes
  useEffect(() => {
    if (listing?.admin_notes) {
      setAdminNotes(listing.admin_notes || "");
    }
  }, [listing?.admin_notes]);

  const handleClose = () => {
    closeDetailModal();
    setRejectionReason("");
    setFlaggedReason("");
    setAdminNotes("");
  };

  const handleApprove = async () => {
    if (!listing) return;
    setIsApproving(true);
    try {
      const result = await approveListing(listing.id);
      if (!result.success) {
        throw new Error(result.error || 'Failed to approve listing');
      }
      router.refresh();
      handleClose();
    } catch (error) {
      console.error("Failed to approve listing:", error);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!listing || !rejectionReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }
    setIsRejecting(true);
    try {
      const result = await rejectListing(listing.id, rejectionReason.trim());
      if (!result.success) {
        throw new Error(result.error || 'Failed to reject listing');
      }
      router.refresh();
      handleClose();
    } catch (error) {
      console.error("Failed to reject listing:", error);
    } finally {
      setIsRejecting(false);
    }
  };

  const handleFlag = async () => {
    if (!listing || !flaggedReason.trim()) {
      alert("Please provide a flag reason");
      return;
    }
    setIsFlagging(true);
    try {
      // TODO: Add flagListing Server Action when needed
      // For now, flagging is not implemented as a Server Action
      console.warn("Flag listing not yet implemented as Server Action");
      handleClose();
    } catch (error) {
      console.error("Failed to flag listing:", error);
    } finally {
      setIsFlagging(false);
    }
  };

  const handleSaveNotes = async () => {
    // TODO: Admin notes update could be added as a separate mutation if needed
    // For now, notes are stored in local state only
  };

  if (!listing) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto" variant="standard">
        <DialogHeader>
          <div className="flex justify-between items-center w-full pr-8">
            <DialogTitle className="text-xl font-bold">{listing.post_name}</DialogTitle>
            <StatusBadge status={listing.status} />
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          {/* Images */}
          {listing.images?.length > 0 && (
            <div>
              <h3 className="font-bold mb-2">
                Images
              </h3>
              <div className="flex gap-2 overflow-x-auto">
                {listing.images.map((imageUrl, index) => (
                  <img
                    key={index}
                    src={imageUrl}
                    alt={`${listing.post_name} ${index + 1}`}
                    className="w-[150px] h-[150px] object-cover rounded-md"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Details */}
          <div>
            <h3 className="font-bold mb-2">
              Description
            </h3>
            <p className="text-gray-700">{listing.post_description}</p>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <h3 className="font-bold mb-1">
                Category
              </h3>
              <p className="text-gray-700">{listing.post_type}</p>
            </div>
            <div className="flex-1">
              <h3 className="font-bold mb-1">
                Created
              </h3>
              <p className="text-gray-700">{new Date(listing.created_at).toLocaleString()}</p>
            </div>
          </div>

          <Separator />

          {/* Admin Notes */}
          <div>
            <h3 className="font-bold mb-2">
              Admin Notes (Internal)
            </h3>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder={t('add_internal_notes_about_this_listing')}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              size="sm"
              className="mt-2 bg-blue-500 hover:bg-blue-600 text-white"
              onClick={handleSaveNotes}
              disabled={isSubmitting}
            >
              Save Notes
            </Button>
          </div>

          {/* Action Controls */}
          {listing.status === "pending" && (
            <>
              <Separator />
              <div>
                <h3 className="font-bold mb-3">
                  Review Actions
                </h3>
                <div className="flex flex-col gap-3">
                  {/* Approve */}
                  <Button
                    onClick={handleApprove}
                    disabled={isSubmitting}
                    size="lg"
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    Approve Listing
                  </Button>

                  {/* Reject */}
                  <div>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder={t('reason_for_rejection_required')}
                      rows={2}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mb-2"
                    />
                    <Button
                      onClick={handleReject}
                      disabled={isSubmitting || !rejectionReason.trim()}
                      className="w-full bg-red-500 hover:bg-red-600 text-white"
                    >
                      Reject Listing
                    </Button>
                  </div>

                  {/* Flag */}
                  <div>
                    <textarea
                      value={flaggedReason}
                      onChange={(e) => setFlaggedReason(e.target.value)}
                      placeholder={t('reason_for_flagging_required')}
                      rows={2}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mb-2"
                    />
                    <Button
                      onClick={handleFlag}
                      disabled={isSubmitting || !flaggedReason.trim()}
                      className="w-full bg-purple-500 hover:bg-purple-600 text-white"
                    >
                      Flag for Review
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Audit Log */}
          <Separator />
          <div>
            <h3 className="font-bold mb-3">
              Audit History
            </h3>
            {isAuditLogsLoading ? (
              <p className="text-gray-500 text-center">
                Loading history...
              </p>
            ) : (
              <AuditLogTimeline logs={auditLogs} />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleClose} variant="outline">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
