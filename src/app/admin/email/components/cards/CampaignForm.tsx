"use client";

/**
 * CampaignForm - Create/edit campaign dialog form
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter } from "@/components/ui/dialog";

interface CampaignFormProps {
  onClose: () => void;
}

export function CampaignForm({ onClose }: CampaignFormProps) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="campaign-name">Campaign Name</Label>
        <Input
          id="campaign-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Weekly Newsletter"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="campaign-subject">Subject Line</Label>
        <Input
          id="campaign-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g., This week on FoodShare..."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="campaign-content">Email Content</Label>
        <Textarea
          id="campaign-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your email content..."
          rows={6}
        />
      </div>
      <DialogFooter className="pt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onClose}>Create Campaign</Button>
      </DialogFooter>
    </div>
  );
}
