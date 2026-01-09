#!/usr/bin/env python3
"""
PDF to Markdown converter using PyMuPDF (fitz)
"""

try:
    import fitz  # PyMuPDF
except ImportError:
    print("Installing PyMuPDF...")
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "PyMuPDF"])
    import fitz

def pdf_to_markdown(pdf_path, output_path):
    """Convert PDF to Markdown format"""
    
    # Open the PDF
    doc = fitz.open(pdf_path)
    markdown_content = []
    
    # Add title
    markdown_content.append(f"# {pdf_path.split('/')[-1].replace('.pdf', '')}\n\n")
    
    # Process each page
    for page_num in range(len(doc)):
        page = doc[page_num]
        
        # Add page header
        markdown_content.append(f"\n---\n\n## Page {page_num + 1}\n\n")
        
        # Extract text
        text = page.get_text()
        
        # Clean up and format the text
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if line:
                markdown_content.append(line + '\n')
        
        markdown_content.append('\n')
    
    # Write to output file
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(''.join(markdown_content))
    
    total_pages = len(doc)
    doc.close()
    print(f"Successfully converted {pdf_path} to {output_path}")
    print(f"Total pages: {total_pages}")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python pdf_to_markdown.py <input.pdf> [output.md]")
        sys.exit(1)
    
    input_pdf = sys.argv[1]
    output_md = sys.argv[2] if len(sys.argv) > 2 else input_pdf.replace('.pdf', '.md')
    
    pdf_to_markdown(input_pdf, output_md)
