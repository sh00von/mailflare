"use client";

import { useState } from "react";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { authFetch } from "@/lib/auth/client";
import { textToHtml } from "./rich-text-utils";
import type { NewTemplateDialogProps } from "./template-types";

export function NewTemplateDialog({ open, onOpenChange, mailboxId, from }: NewTemplateDialogProps) {
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [saving, setSaving] = useState(false);

	async function save() {
		setSaving(true);
		try {
			const response = await authFetch("/api/templates", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ mailboxId, from, title, text: content, html: textToHtml(content) }),
			});
			const result = await notify.fromResponse(response, { success: "Template saved", error: "Could not save template" });
			if (!result.ok) return;
			onOpenChange(false);
			setTitle("");
			setContent("");
		} catch (saveError) {
			notify.error(saveError, "Could not save template");
		} finally {
			setSaving(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="max-h-[calc(100vh-4rem)] overflow-y-auto">
					<DialogHeader><DialogTitle>New template</DialogTitle></DialogHeader>
					<form
						className="space-y-4"
						onSubmit={(event) => { event.preventDefault(); void save(); }}
					>
						<div className="space-y-1.5">
							<Label htmlFor="template-title">Title</Label>
							<Input id="template-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} required />
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="template-content">Content</Label>
							<Textarea id="template-content" value={content} onChange={(event) => setContent(event.target.value)} rows={8} required />
						</div>
						<Button type="submit" disabled={saving || !title.trim() || !content.trim()}>
							{saving ? "Saving…" : "Save template"}
						</Button>
					</form>
				</DialogContent>
			</Dialog>
	);
}
