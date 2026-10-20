"""Read the historical FIDE text layouts without losing headerless first rows."""
import re


def standard_fields(line, year):
    if not line.strip() or line.strip() == '\x1a' or line.lstrip().lower().startswith(('id number', 'id_number')):
        return None
    if year >= 2014:
        # Other-title lists sometimes overflow their nominal fixed-width field.
        # Anchor before the first number so a birth year of 0 cannot shift fields.
        tail = re.fullmatch(r'\D*(\d{1,4})\s+\d+\s+\d+\s+(?:\d{1,4})?\s*([a-z]*)\s*', line[100:])
        if not tail:
            raise ValueError('Invalid modern rating tail')
        parts = (line[15:76], line[76:80], tail[1], line[:15], line[84:89], tail[2])
    elif year >= 2004:
        parts = (line[10:44], line[48:53], line[53:59], line[:10], line[44:48], line[73:] if year == 2004 else line[70:])
    else:
        parts = (line[12:45], line[51:59], line[59:65], line[:12], line[45:51], line[80:])
    if not parts[2].strip().isdigit():
        raise ValueError('Invalid source rating')
    return parts
