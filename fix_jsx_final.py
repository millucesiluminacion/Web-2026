import os
import re

filepath = r"c:\Users\Administrator\Desktop\Pagina Web\Web-2026\src\pages\admin\ProductList.jsx"

with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Find the start of the variants empty state
empty_state_marker = "No hay variantes. Crea una arriba con precio y stock propios."
start_idx = text.find(empty_state_marker)

if start_idx != -1:
    # 2. We want to cut the file completely after the closing div of the empty state 
    # and rebuild the footer perfectly.
    
    # We find the end of the line containing the marker
    line_end = text.find('\n', start_idx)
    
    # The empty state marker is on line 1681. Its closing div is on 1682, and closing )} on 1683.
    # Let's cleanly slice exactly after the "No hay variantes..." text line
    
    clean_footer = """                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
"""
    new_text = text[:line_end] + "\n" + clean_footer
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_text)
    print("Repaired ProductList.jsx correct JSX structure.")
else:
    print("Marker not found.")
