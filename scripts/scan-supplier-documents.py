"""Extract reviewable Docling JSON with page and bounding-box provenance."""
import argparse
from pathlib import Path

from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.document_converter import DocumentConverter, PdfFormatOption


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    options = PdfPipelineOptions()
    options.do_table_structure = True
    options.generate_picture_images = True
    converter = DocumentConverter(format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=options)})
    files = sorted(args.source.rglob("*")) if args.source.is_dir() else [args.source]
    for file in files:
        if file.suffix.lower() not in {".pdf", ".docx", ".jpg", ".jpeg", ".png"}:
            continue
        relative = file.relative_to(args.source) if args.source.is_dir() else Path(file.name)
        destination = args.output / relative.parent / (relative.name + ".json")
        if destination.exists():
            continue
        destination.parent.mkdir(parents=True, exist_ok=True)
        result = converter.convert(file)
        temporary = destination.with_suffix(".tmp")
        result.document.save_as_json(temporary)
        temporary.replace(destination)
        print(f"{relative}: {len(result.document.tables)} tables, {len(result.document.pictures)} pictures", flush=True)


if __name__ == "__main__":
    main()
