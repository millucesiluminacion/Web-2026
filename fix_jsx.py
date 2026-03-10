import os
import re

filepath = r"c:\Users\Administrator\Desktop\Pagina Web\Web-2026\src\pages\admin\ProductList.jsx"

with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Find the start of the variants empty state
empty_state_marker = "No hay variantes. Crea una arriba con precio y stock propios."
start_idx = text.find(empty_state_marker)

if start_idx != -1:
    # Go back to the <div className="text-center...
    div_start = text.rfind('<div', 0, start_idx)
    
    # 2. We want to cut the file completely after this div and rebuild the footer.
    # We will slice up to the end of the 'No hay variantes...' text + the closing </div>
    
    # The clean JSX string to append
    footer = """                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
"""
    
    # We find the end of the line containing the marker
    line_end = text.find('\n', start_idx)
    
    # Keep everything up to the line end
    new_text = text[:line_end] + "\n" + footer
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_text)
    print("Repaired ProductList.jsx footer via script.")
else:
    print("Marker not found.")
