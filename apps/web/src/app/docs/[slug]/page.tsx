import { readFile } from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

const docs = {
  "quick-start": { title: "Quick Start", file: "QUICK_START.md" },
  architecture: { title: "Architecture", file: "ARCHITECTURE.md" },
  deployment: { title: "Deployment", file: "DEPLOYMENT.md" },
  "crypto-payments": { title: "Crypto Payments", file: "CRYPTO_PAYMENTS.md" },
  "cloud-services": { title: "Cloud Services", file: "CLOUD_SERVICES.md" },
  "folder-structure": { title: "Folder Structure", file: "FOLDER_STRUCTURE.md" },
  "grant-proposal-one-page": { title: "Grant Proposal", file: "grant-proposal-one-page.md" },
  "grant-proposal-short": { title: "Grant Proposal Short", file: "grant-proposal-short.md" },
  "grant-application-answers": { title: "Grant Application Answers", file: "grant-application-answers.md" }
} as const;

type DocSlug = keyof typeof docs;

export function generateStaticParams() {
  return Object.keys(docs).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = docs[slug as DocSlug];
  return { title: doc ? `${doc.title} | NEXMINT AI Docs` : "NEXMINT AI Docs" };
}

export default async function DocsArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = docs[slug as DocSlug];
  if (!doc) notFound();

  const markdown = await readDoc(doc.file).catch(() => undefined);
  if (!markdown) notFound();

  return (
    <main className="min-h-screen bg-[#05070d] text-white">
      <SiteHeader />
      <section className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.12),transparent_55%,rgba(163,230,53,0.08))]">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <Link className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-muted hover:bg-white/10 hover:text-white" href="/docs">
            <ArrowLeft size={16} /> Back to Docs
          </Link>
          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-cyan/25 bg-cyan/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan">
            <BookOpen size={14} /> Documentation
          </div>
          <h1 className="mt-5 text-4xl font-black md:text-5xl">{doc.title}</h1>
        </div>
      </section>
      <article className="mx-auto max-w-5xl px-4 py-10">
        <MarkdownBlocks markdown={markdown} />
      </article>
    </main>
  );
}

async function readDoc(file: string) {
  const repoDocsPath = path.resolve(process.cwd(), "../../docs", file);
  return readFile(repoDocsPath, "utf8");
}

function MarkdownBlocks({ markdown }: { markdown: string }) {
  const blocks = toBlocks(markdown);
  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        if (block.type === "code") {
          return (
            <pre key={index} className="overflow-auto rounded-xl border border-white/10 bg-black/45 p-5 text-sm leading-6 text-cyan">
              <code>{block.content}</code>
            </pre>
          );
        }
        if (block.type === "h1") return <h2 key={index} className="pt-2 text-3xl font-black">{block.content}</h2>;
        if (block.type === "h2") return <h3 key={index} className="pt-6 text-2xl font-black text-cyan">{block.content}</h3>;
        if (block.type === "h3") return <h4 key={index} className="pt-4 text-xl font-bold">{block.content}</h4>;
        if (block.type === "list") {
          return (
            <ul key={index} className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-slate-300">
              {block.items.map((item) => <li key={item} className="pl-1">- {item}</li>)}
            </ul>
          );
        }
        return <p key={index} className="text-sm leading-7 text-slate-300">{block.content}</p>;
      })}
    </div>
  );
}

type MarkdownBlock =
  | { type: "h1" | "h2" | "h3" | "p" | "code"; content: string }
  | { type: "list"; items: string[] };

function toBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let code: string[] = [];
  let inCode = false;

  function flushParagraph() {
    if (!paragraph.length) return;
    blocks.push({ type: "p", content: paragraph.join(" ") });
    paragraph = [];
  }

  function flushList() {
    if (!list.length) return;
    blocks.push({ type: "list", items: list });
    list = [];
  }

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inCode) {
        blocks.push({ type: "code", content: code.join("\n") });
        code = [];
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      code.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }
    if (trimmed.startsWith("### ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "h3", content: trimmed.replace(/^###\s+/, "") });
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "h2", content: trimmed.replace(/^##\s+/, "") });
      continue;
    }
    if (trimmed.startsWith("# ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "h1", content: trimmed.replace(/^#\s+/, "") });
      continue;
    }
    if (trimmed.startsWith("- ")) {
      flushParagraph();
      list.push(trimmed.replace(/^-\s+/, ""));
      continue;
    }
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  if (code.length) blocks.push({ type: "code", content: code.join("\n") });
  return blocks;
}
