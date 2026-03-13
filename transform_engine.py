#!/usr/bin/env python3
"""
Transform AutoIntegrateEngine.js for V8 JavaScript compatibility.

Changes:
1. Constructor var declarations -> this. instance variables
2. Fix this.global.this.par and this.global.this.ppar bugs
3. In non-constructor methods: replace bare references to instance vars with this.varName
4. In non-constructor methods: replace bare calls to class methods with this.methodName(

IMPORTANT: Method *definitions* (e.g. `setGUI(aigui) {`) must NOT get this. prefix.
Only method *calls* within method bodies should get this. prefix.
"""

import re
import sys

JS_FILE = r'C:\Users\jarmo_000\GitHub\AutoIntegrate\AutoIntegrateEngine.js'

# All instance variables declared with var in constructor
INSTANCE_VARS = [
    'medianFWHM',
    'L_images', 'R_images', 'G_images', 'B_images',
    'H_images', 'S_images', 'O_images', 'C_images',
    'astrobin_info', 'spcc_params', 'process_narrowband',
    'logfname', 'alignedFiles',
    'mask_win', 'mask_win_id', 'star_mask_win', 'star_mask_win_id',
    'star_fix_mask_win', 'star_fix_mask_win_id',
    'RGB_win', 'RGB_win_id',
    'L_processed_id', 'L_processed_HT_win', 'L_processed_HT_id',
    'RGB_processed_id',
    'is_color_files', 'is_rgb_files', 'is_narrowband_files',
    'preprocessed_images', 'save_id_list',
    'luminance_id', 'red_id', 'green_id', 'blue_id',
    'luminance_crop_id',
    'L_id', 'R_id', 'G_id', 'B_id', 'H_id', 'S_id', 'O_id',
    'RGB_color_id',
    'RGBHa_H_enhanced_info',
    'iconized_image_ids', 'iconized_debug_image_ids',
    'RGB_stars_win', 'RGB_stars_win_HT', 'RGB_stars_channel_ids',
    'local_RGB_stars', 'local_narrowband_mapping',
    'local_L_mapping', 'local_R_mapping', 'local_G_mapping', 'local_B_mapping',
    'local_image_stretching', 'local_debayer_pattern',
    'local_RGBHa_prepare_method', 'local_RGBHa_combine_method',
    'script_start_time',
    'L_GC_start_win', 'R_GC_start_win', 'G_GC_start_win', 'B_GC_start_win',
    'H_GC_start_win', 'S_GC_start_win', 'O_GC_start_win', 'RGB_GC_start_win',
    'L_HT_start_win', 'RGB_HT_start_win',
    'range_mask_win', 'final_win', 'solved_imageId',
    'current_telescope_name',
    'linear_fit_rerefence_id',
    'stepno',
    'retval', 'channels', 'GraXpertCmd', 'telescope_info',
]

# Known PixInsight/JS builtins and other things that should NOT get this. prefix
# when used as function calls
SKIP_METHODS = {
    'constructor', 'super', 'gc', 'CoreApplication.processEvents', 'Format',
    # Math and JS builtins
    'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'eval',
    'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
    # Object constructors (used with 'new')
    'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Date',
    'Error', 'RegExp', 'Promise', 'Map', 'Set', 'Function',
    # PixInsight process constructors
    'ImageIntegration', 'StarAlignment', 'ImageCalibration',
    'SubframeSelector', 'ChannelExtraction', 'ChannelCombination',
    'LRGBCombination', 'HistogramTransformation', 'ScreenTransferFunction',
    'BackgroundNeutralization', 'ColorCalibration', 'ColorSaturation',
    'CurvesTransformation', 'SCNR', 'Debayer', 'StarMask',
    'HDRMultiscaleTransform', 'LocalHistogramEqualization',
    'MorphologicalTransformation', 'ArcsinhStretch', 'MultiscaleLinearTransform',
    'TGVDenoise', 'ACDNR', 'AutomaticBackgroundExtractor',
    'DynamicBackgroundExtraction', 'LinearFit', 'LocalNormalization',
    'DrizzleIntegration', 'IntegerResample', 'CosmeticCorrection',
    'FastIntegration', 'Superbias', 'PixelMath', 'StarNet', 'StarNet2',
    'StarXTerminator', 'NoiseXTerminator', 'BlurXTerminator',
    'SpectrophotometricColorCalibration', 'SpectrophotometricFluxCalibration',
    'GradientCorrection', 'MultiscaleGradientCorrection',
    'MultiscaleAdaptiveStretch', 'MaskedStretch',
    'Invert', 'UnsharpMask', 'AdaptiveStretch',
    # PixInsight class constructors
    'AutoIntegrateEngine', 'AutoIntegrateGlobal', 'AutoIntegrateUtil',
    'AutoIntegrateFlowchart', 'AutoIntegrateLDD', 'AutoIntegrateBanding',
    'AutoIntegrateVeraLuxHMS', 'AutoIntegrateSelectiveColor',
    'AutoIntegrateGUITools', 'AutoIntegrateEnhancementsGUI',
    # PixInsight global objects used as functions
    'console', 'File', 'ImageWindow', 'View', 'CoreApplication',
    'Math', 'ImageMetadata', 'Dialog', 'TextAlign_Right',
    # Common array/string methods (called on objects, not bare)
    # These wouldn't match anyway since they'd have obj. prefix
}

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def transform_constructor(content):
    """Fix constructor body: var X -> this.X, and fix this.global.this.par bugs."""
    # Fix this.global.this.par and this.global.this.ppar
    content = content.replace('this.global.this.par', 'this.global.par')
    content = content.replace('this.global.this.ppar', 'this.global.ppar')

    # Find constructor boundaries
    constructor_start = content.find('constructor(global, util, flowchart) {')
    if constructor_start == -1:
        print("ERROR: Could not find constructor!")
        return content

    # Find '} // constructor'
    constructor_end = content.find('} // constructor', constructor_start)
    if constructor_end == -1:
        print("ERROR: Could not find '} // constructor'!")
        return content
    constructor_end += len('} // constructor')

    constructor_body = content[constructor_start:constructor_end]

    # Replace var declarations for instance vars
    for varname in INSTANCE_VARS:
        pattern = r'\bvar\s+(' + re.escape(varname) + r')\b'
        replacement = r'this.\1'
        new_body = re.sub(pattern, replacement, constructor_body)
        if new_body != constructor_body:
            pass  # change made
        constructor_body = new_body

    return content[:constructor_start] + constructor_body + content[constructor_end:]

def find_class_methods(content):
    """Find all method names defined in the AutoIntegrateEngine class."""
    constructor_end_pos = content.find('} // constructor')
    if constructor_end_pos == -1:
        return set()
    constructor_end_pos += len('} // constructor')

    class_end_pos = content.find('}  /* AutoIntegrateEngine*/')
    if class_end_pos == -1:
        class_end_pos = len(content)

    class_body = content[constructor_end_pos:class_end_pos]

    # Method definitions: start of line, identifier, optional whitespace, open paren
    method_pattern = re.compile(r'^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(', re.MULTILINE)
    methods = set()
    for m in method_pattern.finditer(class_body):
        methods.add(m.group(1))

    print(f"Found {len(methods)} class methods")
    return methods

def get_local_vars_in_method_body(method_body_text):
    """Find all var-declared variable names in a method body (excluding the signature)."""
    local_vars = set()
    # Match var declarations - handles: var a, var a = ..., var a, b, c
    var_decl_pattern = re.compile(r'\bvar\s+([a-zA-Z_$][a-zA-Z0-9_$]*)', re.MULTILINE)
    for m in var_decl_pattern.finditer(method_body_text):
        local_vars.add(m.group(1))
    return local_vars

def replace_bare_identifiers(text, names_to_prefix, prefix='this.'):
    """
    Replace bare occurrences of identifiers in `names_to_prefix` with prefix+name.

    A "bare" occurrence means:
    - Not preceded by a dot (property access like obj.name)
    - Not already preceded by 'this.'
    - Full word boundary on both sides

    This function works on the text as-is (no comment/string awareness -
    that's acceptable for this use case).
    """
    # Build pattern that matches any of the names as whole words,
    # not preceded by . or word characters
    # We process each name separately (sorted by length desc) to avoid conflicts

    names_sorted = sorted(names_to_prefix, key=len, reverse=True)

    for name in names_sorted:
        # Use negative lookbehind for '.' and word chars
        # (?<![.\w]) ensures we don't match after a dot or word char
        # (?!\w) ensures we match a complete word (not a prefix of a longer word)
        pattern = r'(?<![.\w])' + re.escape(name) + r'(?!\w)'
        replacement = prefix + name
        text = re.sub(pattern, replacement, text)

    return text

def replace_bare_method_calls(text, method_names, prefix='this.'):
    """
    Replace bare method calls (identifier followed by () with this.identifier.
    Only replaces calls (followed by '('), not other references.
    Does NOT replace method definitions (which appear at start of line with no indent change).
    """
    names_sorted = sorted(method_names, key=len, reverse=True)

    for name in names_sorted:
        # Match: not preceded by . or word char, the name, followed by optional whitespace then (
        # This handles both: methodName( and methodName (with space before paren
        pattern = r'(?<![.\w])' + re.escape(name) + r'(?=\s*\()'
        replacement = prefix + name
        text = re.sub(pattern, replacement, text)

    return text

def find_method_body_start(text, method_start):
    """
    Given text and the position where a method definition starts,
    find the position of the opening '{' for the method body.
    Returns position of '{' or -1 if not found.
    """
    # Method definitions can be:
    # methodName(args) {
    # methodName(args)
    # {
    # We need to find the { that opens the body, skipping any ( ) in the signature

    i = method_start
    # Find the opening ( of the parameter list
    while i < len(text) and text[i] != '(':
        i += 1
    if i >= len(text):
        return -1

    # Skip matching parens
    depth = 0
    while i < len(text):
        if text[i] == '(':
            depth += 1
        elif text[i] == ')':
            depth -= 1
            if depth == 0:
                i += 1
                break
        i += 1

    # Now find the opening {
    while i < len(text):
        if text[i] == '{':
            return i
        elif text[i] not in ' \t\n\r/':
            # Something unexpected (like a comment start)
            if text[i] == '/' and i+1 < len(text) and text[i+1] in '/*':
                # Skip comment
                if text[i+1] == '/':
                    # Line comment
                    while i < len(text) and text[i] != '\n':
                        i += 1
                elif text[i+1] == '*':
                    # Block comment
                    i += 2
                    while i < len(text) - 1:
                        if text[i] == '*' and text[i+1] == '/':
                            i += 2
                            break
                        i += 1
            else:
                break
        i += 1

    if i < len(text) and text[i] == '{':
        return i
    return -1

def process_file(content, instance_vars, class_methods):
    """
    Main transformation:
    1. Find each method (after constructor)
    2. For each method body, determine local vars
    3. Replace bare instance var references and bare method calls
    """
    constructor_end_marker = '} // constructor'
    constructor_end_pos = content.find(constructor_end_marker)
    if constructor_end_pos == -1:
        print("ERROR: Could not find constructor end!")
        return content

    search_start = constructor_end_pos + len(constructor_end_marker)

    class_end_marker = '}  /* AutoIntegrateEngine*/'
    class_end = content.find(class_end_marker)
    if class_end == -1:
        print("ERROR: Could not find class end!")
        return content

    # Find all method definition positions in the class body (after constructor)
    # Method defs: at start of a line, identifier followed by (
    method_def_pattern = re.compile(r'^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(', re.MULTILINE)

    method_positions = []
    for m in method_def_pattern.finditer(content, search_start, class_end):
        method_positions.append((m.start(), m.group(1)))

    print(f"Found {len(method_positions)} method positions to process")

    # Determine which methods should NOT get this. prefix when called
    # (they are class methods but have specific exclusion reasons)
    callable_methods = class_methods - SKIP_METHODS

    # We'll build the result by processing segments between methods
    # For each method: the "header" (signature line up to and including {) stays unchanged,
    # and the body (from { to matching }) gets transformed.

    # Process in reverse order to preserve character positions
    # Actually, let's build a list of (start, end, replacement) tuples

    replacements = []  # (start, end, new_text) - will apply in reverse order

    for i, (def_start, method_name) in enumerate(method_positions):
        # The method body ends just before the next method definition
        # (or at class_end for the last method)
        if i + 1 < len(method_positions):
            def_end = method_positions[i+1][0]
        else:
            def_end = class_end

        # Full text of this method (from signature to before next method)
        full_method_text = content[def_start:def_end]

        # Find the opening { of the body
        body_open_in_method = find_method_body_start(full_method_text, 0)

        if body_open_in_method == -1:
            print(f"WARNING: Could not find opening {{ for method {method_name} at line ~{content[:def_start].count(chr(10))+1}")
            continue

        # The body is from body_open + 1 to the matching closing }
        # The signature is: full_method_text[0:body_open+1]
        signature = full_method_text[:body_open_in_method + 1]
        body_and_rest = full_method_text[body_open_in_method + 1:]

        # Find matching closing } for the body
        # Count braces to find the matching close
        depth = 1
        j = 0
        while j < len(body_and_rest) and depth > 0:
            c = body_and_rest[j]
            if c == '{':
                depth += 1
            elif c == '}':
                depth -= 1
            j += 1

        if depth != 0:
            print(f"WARNING: Could not find matching closing brace for method {method_name}")
            continue

        # body_and_rest[0:j] is the body content (including closing })
        # body_and_rest[j:] is content after the method (before next method)
        body = body_and_rest[:j]  # includes the closing }
        after_body = body_and_rest[j:]

        # Find local var declarations in this body
        local_vars = get_local_vars_in_method_body(body)

        # Determine which instance vars are NOT shadowed
        active_instance_vars = [v for v in instance_vars if v not in local_vars]

        # Determine which class methods to replace (not shadowed by local vars)
        active_methods = [m for m in callable_methods if m not in local_vars and m != method_name]

        # Transform the body
        new_body = body

        # Step 1: Replace bare instance variable references
        new_body = replace_bare_identifiers(new_body, active_instance_vars, 'this.')

        # Step 2: Replace bare method calls
        new_body = replace_bare_method_calls(new_body, active_methods, 'this.')

        if new_body != body:
            # Build the replacement
            new_full = signature + new_body + after_body
            replacements.append((def_start, def_end, new_full))

    print(f"Generated {len(replacements)} method replacements")

    # Apply replacements in reverse order
    replacements.sort(key=lambda x: x[0], reverse=True)

    result = content
    for (start, end, new_text) in replacements:
        result = result[:start] + new_text + result[end:]

    return result

def main():
    print(f"Reading {JS_FILE}...")
    content = read_file(JS_FILE)
    original_len = len(content)
    print(f"File size: {original_len} chars, {content.count(chr(10))+1} lines")

    # Step 1: Transform constructor
    print("\nStep 1: Transforming constructor...")
    content = transform_constructor(content)

    # Step 2: Find all class methods
    print("\nStep 2: Finding class methods...")
    class_methods = find_class_methods(content)

    # Step 3: Process all non-constructor methods
    print("\nStep 3: Processing method bodies...")
    content = process_file(content, INSTANCE_VARS, class_methods)

    # Step 4: Write output
    output_path = JS_FILE
    print(f"\nStep 4: Writing {output_path}...")
    write_file(output_path, content)

    new_len = len(content)
    print(f"Done! Original: {original_len} chars, New: {new_len} chars, Delta: {new_len - original_len}")

    # Verification: check constructor
    constructor_start = content.find('constructor(global, util, flowchart) {')
    constructor_end = content.find('} // constructor')
    if constructor_start != -1 and constructor_end != -1:
        constructor_body = content[constructor_start:constructor_end]
        remaining_vars = []
        for varname in INSTANCE_VARS:
            if re.search(r'\bvar\s+' + re.escape(varname) + r'\b', constructor_body):
                remaining_vars.append(varname)
        if remaining_vars:
            print(f"WARNING: Still have var declarations in constructor: {remaining_vars}")
        else:
            print("OK: All instance var declarations converted in constructor")

        if 'this.global.this.par' in constructor_body or 'this.global.this.ppar' in constructor_body:
            print("WARNING: Still have this.global.this.par/ppar in constructor!")
        else:
            print("OK: Fixed this.global.this.par/ppar bugs")

    # Verify method definitions are NOT prefixed with this.
    class_end = content.find('}  /* AutoIntegrateEngine*/')
    constructor_end_pos = content.find('} // constructor')
    if constructor_end_pos != -1 and class_end != -1:
        class_body_after_constructor = content[constructor_end_pos:class_end]
        # Check for this.methodName( at start of line (method definitions shouldn't have this.)
        bad_defs = re.findall(r'^this\.[a-zA-Z_][a-zA-Z0-9_]*\s*\(', class_body_after_constructor, re.MULTILINE)
        if bad_defs:
            print(f"WARNING: Found {len(bad_defs)} method definitions with this. prefix (should not happen):")
            for b in bad_defs[:5]:
                print(f"  {b}")
        else:
            print("OK: No method definitions incorrectly prefixed with this.")

if __name__ == '__main__':
    main()
