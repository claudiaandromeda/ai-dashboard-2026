from pathlib import Path
pdf_path = Path("Initial Prompt for CCP.pdf")
try:
    import PyPDF2
except Exception as e:
    print("NO_PYPDF2", e)
    raise SystemExit(1)

reader = PyPDF2.PdfReader(str(pdf_path))
text = []
for i, page in enumerate(reader.pages):
    try:
        text.append(page.extract_text() or "")
    except Exception as e:
        text.append(f"\n[page {i} extract error: {e}]\n")

out = Path("Initial Prompt for CCP.extracted.txt")
out.write_text("\n\n".join(text), encoding="utf-8")
print("OK", out)
