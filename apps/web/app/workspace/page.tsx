"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { RichEditor } from "./RichEditor";
import {
  apiFetch,
  type DocumentNode,
  type DocumentRecord,
  type Project,
  type Snapshot,
} from "./web-api";

type User = {
  id: string;
  email: string;
  displayName: string;
};

function findDocument(documents: DocumentNode[], documentId: string): DocumentNode | null {
  for (const document of documents) {
    if (document.id === documentId) {
      return document;
    }
    const child = findDocument(document.children, documentId);
    if (child) {
      return child;
    }
  }

  return null;
}

export default function WorkspacePage() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [documents, setDocuments] = useState<DocumentNode[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const [selectedDocument, setSelectedDocument] = useState<DocumentRecord | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [projectTitle, setProjectTitle] = useState("");
  const [newDocumentTitle, setNewDocumentTitle] = useState("");

  const selectedTreeDocument = useMemo(
    () => (selectedDocumentId ? findDocument(documents, selectedDocumentId) : null),
    [documents, selectedDocumentId],
  );

  async function loadProjects() {
    const response = await apiFetch<{ projects: Project[] }>("/api/projects");
    setProjects(response.projects);
    setProjectId((current) => current || response.projects[0]?.id || "");
  }

  const loadDocuments = useCallback(async (activeProjectId: string) => {
    if (!activeProjectId) {
      setDocuments([]);
      return;
    }

    const response = await apiFetch<{ documents: DocumentNode[] }>(
      `/api/projects/${activeProjectId}/documents/tree`,
    );
    setDocuments(response.documents);
  }, []);

  const loadSnapshots = useCallback(async (activeProjectId: string, documentId: string) => {
    const response = await apiFetch<{ snapshots: Snapshot[] }>(
      `/api/projects/${activeProjectId}/documents/${documentId}/snapshots`,
    );
    setSnapshots(response.snapshots);
  }, []);

  const loadDocument = useCallback(
    async (activeProjectId: string, documentId: string) => {
      const response = await apiFetch<{ document: DocumentRecord }>(
        `/api/projects/${activeProjectId}/documents/${documentId}`,
      );
      setSelectedDocument(response.document);
      if (response.document.type !== "folder") {
        await loadSnapshots(activeProjectId, documentId);
      } else {
        setSnapshots([]);
      }
    },
    [loadSnapshots],
  );

  useEffect(() => {
    async function boot() {
      try {
        const setup = await apiFetch<{ needsSetup: boolean }>("/api/auth/setup-status");
        if (setup.needsSetup) {
          window.location.href = "/setup";
          return;
        }

        const auth = await apiFetch<{ user: User }>("/api/auth/me");
        setUser(auth.user);
        await loadProjects();
      } catch {
        window.location.href = "/login";
      }
    }

    void boot();
  }, []);

  useEffect(() => {
    void loadDocuments(projectId);
    setSelectedDocumentId("");
    setSelectedDocument(null);
    setSnapshots([]);
  }, [loadDocuments, projectId]);

  async function createProject(event: FormEvent) {
    event.preventDefault();
    if (!projectTitle.trim()) {
      return;
    }

    const response = await apiFetch<{ project: Project }>("/api/projects", {
      method: "POST",
      body: JSON.stringify({ title: projectTitle }),
    });
    setProjectTitle("");
    setProjects((current) => [response.project, ...current]);
    setProjectId(response.project.id);
  }

  async function archiveProject() {
    if (!projectId || !confirm("Archive this project?")) {
      return;
    }

    await apiFetch(`/api/projects/${projectId}/archive`, { method: "POST" });
    setProjects((current) => current.filter((project) => project.id !== projectId));
    setProjectId("");
    setDocuments([]);
    setSelectedDocument(null);
  }

  async function createDocument(type: "folder" | "manuscript" | "note") {
    if (!projectId) {
      return;
    }

    const parentId = selectedTreeDocument?.type === "folder" ? selectedTreeDocument.id : null;
    const title =
      newDocumentTitle.trim() ||
      (type === "folder" ? "New Folder" : type === "note" ? "New Note" : "Untitled");
    const response = await apiFetch<{ document: DocumentRecord }>(
      `/api/projects/${projectId}/documents`,
      {
        method: "POST",
        body: JSON.stringify({ parentId, type, title }),
      },
    );
    setNewDocumentTitle("");
    await loadDocuments(projectId);
    setSelectedDocumentId(response.document.id);
    await loadDocument(projectId, response.document.id);
  }

  async function selectDocument(document: DocumentNode) {
    setSelectedDocumentId(document.id);
    await loadDocument(document.projectId, document.id);
  }

  async function patchSelectedDocument(
    payload: Partial<{
      editorJson: Record<string, unknown>;
      plainText: string;
      title: string;
    }>,
  ) {
    if (!projectId || !selectedDocument) {
      throw new Error("No document selected.");
    }

    const response = await apiFetch<{ document: DocumentRecord }>(
      `/api/projects/${projectId}/documents/${selectedDocument.id}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
    setSelectedDocument(response.document);
    await loadDocuments(projectId);
    return response.document;
  }

  async function saveDocument(payload: { editorJson: Record<string, unknown>; plainText: string }) {
    return patchSelectedDocument(payload);
  }

  async function createSnapshot() {
    if (!projectId || !selectedDocument || selectedDocument.type === "folder") {
      return;
    }

    await apiFetch(`/api/projects/${projectId}/documents/${selectedDocument.id}/snapshots`, {
      method: "POST",
      body: JSON.stringify({
        reason: "manual",
        title: `Manual snapshot ${new Date().toLocaleString()}`,
      }),
    });
    await loadSnapshots(projectId, selectedDocument.id);
  }

  async function restoreSnapshot(snapshotId: string) {
    if (!projectId || !selectedDocument || !confirm("Restore this snapshot?")) {
      return;
    }

    const response = await apiFetch<{ document: DocumentRecord }>(
      `/api/projects/${projectId}/documents/${selectedDocument.id}/snapshots/${snapshotId}/restore`,
      { method: "POST" },
    );
    setSelectedDocument(response.document);
    await loadDocuments(projectId);
    await loadSnapshots(projectId, selectedDocument.id);
  }

  async function moveDocument(document: DocumentNode, direction: -1 | 1, siblings: DocumentNode[]) {
    if (!projectId) {
      return;
    }

    const index = siblings.findIndex((sibling) => sibling.id === document.id);
    const target = siblings[index + direction];
    if (!target) {
      return;
    }

    await apiFetch(`/api/projects/${projectId}/documents/reorder`, {
      method: "POST",
      body: JSON.stringify({
        moves: [
          { documentId: document.id, parentId: document.parentId, sortOrder: target.sortOrder },
          { documentId: target.id, parentId: target.parentId, sortOrder: document.sortOrder },
        ],
      }),
    });
    await loadDocuments(projectId);
  }

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <main className="workspace">
      <aside className="sidebar">
        <div className="stack">
          <div>
            <strong>Seshat</strong>
            <p className="muted">{user?.displayName}</p>
          </div>
          <button onClick={logout}>Log out</button>
          <form className="stack" onSubmit={createProject}>
            <input
              placeholder="New project"
              value={projectTitle}
              onChange={(event) => setProjectTitle(event.target.value)}
            />
            <button className="primary" type="submit">
              Create project
            </button>
          </form>
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="">Select project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
          <button className="danger" disabled={!projectId} onClick={archiveProject}>
            Archive project
          </button>
        </div>

        <h2 className="section-heading">Binder</h2>
        <div className="stack">
          <input
            placeholder="New item title"
            value={newDocumentTitle}
            onChange={(event) => setNewDocumentTitle(event.target.value)}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <button disabled={!projectId} onClick={() => createDocument("folder")}>
              Folder
            </button>
            <button disabled={!projectId} onClick={() => createDocument("manuscript")}>
              Doc
            </button>
            <button disabled={!projectId} onClick={() => createDocument("note")}>
              Note
            </button>
          </div>
        </div>

        <BinderList
          activeId={selectedDocumentId}
          documents={documents}
          level={0}
          onMove={moveDocument}
          onSelect={selectDocument}
        />
      </aside>

      <section className="editor-shell">
        <div className="topbar">
          <div>
            <h1 className="document-title">{selectedDocument?.title ?? "No document selected"}</h1>
            <span className="muted">
              {selectedDocument
                ? `${selectedDocument.type} · ${selectedDocument.wordCount} words`
                : "Create or select a document to start writing."}
            </span>
          </div>
        </div>
        {selectedDocument && selectedDocument.type !== "folder" ? (
          <RichEditor document={selectedDocument} onSave={saveDocument} />
        ) : (
          <div className="editor-area">
            <div className="prose-editor">
              <p className="muted">
                {selectedDocument?.type === "folder"
                  ? "Folders organize your binder. Select or create a manuscript document or note to write."
                  : "Your writing space will appear here."}
              </p>
            </div>
          </div>
        )}
      </section>

      <aside className="details">
        <h2 className="section-heading">Details</h2>
        {selectedDocument ? (
          <div className="stack">
            <label className="stack">
              Title
              <input
                value={selectedDocument.title}
                onChange={(event) =>
                  setSelectedDocument({ ...selectedDocument, title: event.target.value })
                }
                onBlur={() => patchSelectedDocument({ title: selectedDocument.title })}
              />
            </label>
            <p className="muted">Updated {new Date(selectedDocument.updatedAt).toLocaleString()}</p>
          </div>
        ) : (
          <p className="muted">No document selected.</p>
        )}

        <h2 className="section-heading">Snapshots</h2>
        <button
          className="primary"
          disabled={!selectedDocument || selectedDocument.type === "folder"}
          onClick={createSnapshot}
        >
          Create snapshot
        </button>
        {snapshots.map((snapshot) => (
          <div className="snapshot-row" key={snapshot.id}>
            <strong>{snapshot.title ?? snapshot.reason}</strong>
            <span className="muted">
              {snapshot.wordCount} words · {new Date(snapshot.createdAt).toLocaleString()}
            </span>
            <button onClick={() => restoreSnapshot(snapshot.id)}>Restore</button>
          </div>
        ))}
      </aside>
    </main>
  );
}

function BinderList({
  activeId,
  documents,
  level,
  onMove,
  onSelect,
}: {
  activeId: string;
  documents: DocumentNode[];
  level: number;
  onMove: (document: DocumentNode, direction: -1 | 1, siblings: DocumentNode[]) => void;
  onSelect: (document: DocumentNode) => void;
}) {
  return (
    <div style={{ marginTop: level === 0 ? 14 : 2 }}>
      {documents.map((document, index) => (
        <div key={document.id}>
          <div className="binder-item" style={{ paddingLeft: level * 14 }}>
            <button
              className={`binder-title ${activeId === document.id ? "active" : ""}`}
              onClick={() => onSelect(document)}
            >
              {document.type === "folder" ? "Folder" : document.type === "note" ? "Note" : "Doc"}{" "}
              {document.title}
            </button>
            <button disabled={index === 0} onClick={() => onMove(document, -1, documents)}>
              Up
            </button>
            <button
              disabled={index === documents.length - 1}
              onClick={() => onMove(document, 1, documents)}
            >
              Down
            </button>
          </div>
          {document.children.length > 0 ? (
            <BinderList
              activeId={activeId}
              documents={document.children}
              level={level + 1}
              onMove={onMove}
              onSelect={onSelect}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
