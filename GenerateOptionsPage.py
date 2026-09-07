#!/usr/bin/env python3
"""Generate AutoIntegrateOptions.html, a reference page of all AutoIntegrate options.

The page is generated from the AutoIntegrate sources, there is no separate list of
options that would need to be kept up to date:

  - options, setting names, types and default values come from this.par in
    AutoIntegrateGlobal.js
  - descriptions are the tooltip texts of the GUI controls that use the option
  - possible values come from the *_values arrays used by the combo boxes

When file AutoIntegrateOptions.json is found in the source directory, descriptions,
possible values, default values and simple/expert mode are taken from it. The file
is written by AutoIntegrate itself from the running GUI, so everything in it comes
from the real GUI controls and no tooltip texts need to be searched from the
sources. The file is written with the Write options metadata button in the
Interface tab, Debug settings section. It is also needed for the simple mode page.

Options are put into groups and tagged so that it is possible to see if an option
changes the processed image or only the user interface, and if an option applies
to color images or is specific to OSC/RAW, narrowband or mono data. The tags come from the applies
field of the option in this.par, so they are maintained together with the option
itself. Groups are given by the GROUPS and RULES tables below. When new options
are added they are picked up automatically, but a new option may need a new
grouping rule.

Usage:

    python GenerateOptionsPage.py [-o OUTPUT.html] [--stats]
    python GenerateOptionsPage.py --simple

The script only reads files, it does not need PixInsight.
"""

import argparse
import bisect
import datetime
import html
import json
import os
import re
import sys

GLOBAL_FILE = 'AutoIntegrateGlobal.js'

# Files that create GUI controls for options. Tooltips are searched from these.
GUI_FILES = [
    'AutoIntegrateGUI.js',
    'AutoIntegrateGUITools.js',
    'AutoIntegrateEnhancementsGUI.js',
    'AutoIntegrateExclusionArea.js',
    'AutoIntegratePreview.js',
    'AutoIntegrateSelectiveColor.js',
]

DEFAULT_OUTPUT = 'AutoIntegrateOptions.html'
DEFAULT_SIMPLE_OUTPUT = 'AutoIntegrateOptionsSimple.html'

# Option metadata written by AutoIntegrate, see writeOptionsMetadata in
# AutoIntegrateGUI.js. The file is written from the running GUI, so it has the
# real tooltips, value lists, value ranges and the tab and section of every
# option, and it tells which options are shown in simple mode. When the file is
# missing the page is generated from the sources only and simple mode options
# are not known.
METADATA_FILE = 'AutoIntegrateOptions.json'

# Options that are not shown on the page.
SKIP_OPTIONS = {
    'nxt_detail',       # marked as old in the sources
}

# Descriptions for options that have no tooltip in the GUI.
TIP_OVERRIDE = {
    'enhancements_selective_color_preset':
        'Ready made preset for the selective color adjustments. Currently available presets are '
        'None and Gold and Blue.',
    'enhancements_selective_color_data':
        'Selective color adjustment values. The values are set in the Selective color dialog and '
        'saved with the setup, they are not edited directly.',
    'narrowband_multiple_mappings_list':
        'List of narrowband palettes that are processed when the multiple mappings option is used. '
        'The list is filled from the palette selection dialog.',
    'astrobin_L': 'AstroBin filter number for the L filter, written to the AstrobinInfo.csv file.',
    'astrobin_R': 'AstroBin filter number for the R filter, written to the AstrobinInfo.csv file.',
    'astrobin_G': 'AstroBin filter number for the G filter, written to the AstrobinInfo.csv file.',
    'astrobin_B': 'AstroBin filter number for the B filter, written to the AstrobinInfo.csv file.',
    'astrobin_H': 'AstroBin filter number for the H filter, written to the AstrobinInfo.csv file.',
    'astrobin_S': 'AstroBin filter number for the S filter, written to the AstrobinInfo.csv file.',
    'astrobin_O': 'AstroBin filter number for the O filter, written to the AstrobinInfo.csv file.',
    'astrobin_C': 'AstroBin filter number for the C (color) filter, written to the '
                  'AstrobinInfo.csv file.',
}

# Default values that are references to other variables in the sources.
DEFAULT_OVERRIDE = {
    'this.narrowBandPalettes[0].name': 'SHO',
    'this.narrowBandPalettes[0].R': 'S',
    'this.narrowBandPalettes[0].G': 'H',
    'this.narrowBandPalettes[0].B': 'O',
    'this.image_stretching_values[0]': 'Auto STF',
    'this.enhancements_gradient_correction_values[0]': 'Auto',
}

TYPE_NAMES = {'B': 'checkbox', 'I': 'integer', 'R': 'number', 'S': 'text or list', 'O': 'data'}


# ---------------------------------------------------------------------------
# Groups shown on the page, in the order they are shown.
# ---------------------------------------------------------------------------

GROUPS = [
    ('files',        'Files and file handling',
     'How light and calibration files are found, identified and added.'),
    ('calibration',  'Calibration: bias, darks and flats',
     'How calibration frames are used and how master calibration files are built.'),
    ('cosmetic',     'Cosmetic correction and defects',
     'Hot and cold pixels, linear column and row defects, and banding.'),
    ('quality',      'Frame quality, weighting and filtering',
     'SubframeSelector measurements, image weights, filter limits and outlier rejection.'),
    ('registration', 'Registration, binning, drizzle and cropping',
     'StarAlignment, comet alignment, binning, drizzle and cropping to the common area.'),
    ('integration',  'Image integration and pixel rejection',
     'ImageIntegration, normalization, rejection algorithms and FastIntegration.'),
    ('gradient',     'Gradient correction',
     'When gradient correction is run, and the settings for GC, ABE, DBE, MGC and GraXpert.'),
    ('colorcal',     'Color calibration and plate solving',
     'ColorCalibration, SPCC, and the image solver and target metadata they use.'),
    ('stretch',      'Stretching: linear to non-linear',
     'The stretching algorithm and the settings of each stretching method.'),
    ('noise',        'Noise reduction',
     'When noise reduction is applied and the settings of each noise reduction tool.'),
    ('sharpen',      'Sharpening and deconvolution',
     'BlurXTerminator, GraXpert deconvolution and generic sharpening.'),
    ('stars',        'Star removal, star images and masks',
     'Removing stars, creating separate star images and the masks used in processing.'),
    ('narrowband',   'Narrowband palettes and mapping',
     'Narrowband channel mapping, palettes and multiple mappings.'),
    ('hargb',        'Ha to RGB mapping (RGBHa)',
     'Adding narrowband Ha data into an RGB or OSC image.'),
    ('nbrgb',        'Narrowband to RGB boost (RGBNB)',
     'Boosting an RGB image with narrowband channels using filter bandwidths.'),
    ('lrgb',         'LRGB combination, linear fit and saturation',
     'Combining luminance with color and adjusting color during the main workflow.'),
    ('enh_stars',    'Enhancements: stars',
     'Post-processing steps for stars and starless images.'),
    ('enh_light',    'Enhancements: contrast, stretch and light',
     'Post-processing steps that change tones, contrast and local detail.'),
    ('enh_color',    'Enhancements: color',
     'Post-processing steps that change hue, saturation and channel balance.'),
    ('enh_detail',   'Enhancements: noise reduction and sharpening',
     'Post-processing noise reduction, sharpening and clarity.'),
    ('enh_other',    'Enhancements: background, geometry and annotation',
     'Gradient correction, background smoothing, rotation, signature and annotation.'),
    ('output',       'Saving and output files',
     'Which images are saved, in what format, and where they are written.'),
    ('runmodes',     'Run modes and partial processing',
     'Running only a part of the workflow, and batch, fast and substack modes.'),
    ('ui',           'Interface, preview and flowchart',
     'Options that change only what the script shows or remembers, not the processed image.'),
    ('debug',        'Debugging and diagnostics',
     'Logging, process values and other troubleshooting helpers.'),
    ('metadata',     'AstroBin and metadata',
     'Values written into metadata files. They do not change the images.'),
]

# Option name patterns mapped to a group. The first matching rule is used, so the
# more specific rules must come first. Options that match no rule end up in the
# run modes group, --stats prints the group sizes so a misplaced option is easy
# to notice.
RULES = [
    (r'^astrobin_', 'metadata'),
    (r'^(debug|null_processing|flowchart_debug|print_process_values|create_executed_processes_js'
     r'|image_weight_testing|RGBHa_test_value)$', 'debug'),
    (r'^(show_flowchart|preview_autostf|preview_resample|preview_resample_target'
     r'|flowchart_background_image|flowchart_time|flowchart_saveimage|run_get_flowchart_data'
     r'|start_with_empty_window_prefix|use_manual_icon_column|windows_at_end|create_process_icons'
     r'|reset_on_setup_load|autosave_setup|skip_blink|open_directory|directory_files'
     r'|select_all_files)$', 'ui'),
    (r'^(calibrate_only|generate_masters_only|debayer_only|binning_only|extract_channels_only'
     r'|integrate_only|channelcombination_only|cropinfo_only|batch_mode|fast_mode|fast_mode_opt'
     r'|substack_mode|substack_count|start_from_imageintegration|use_processed_files'
     r'|early_PSF_check|monochrome_image|RRGB_image|synthetic_l_image'
     r'|synthetic_missing_images)$', 'runmodes'),
    (r'^(save_|no_subdirs|unique_file_names|keep_|win_prefix_to_log_files|generate_xdrz'
     r'|stretched_channel_auto_contrast)', 'output'),
    (r'^(lights_add_manually|flats_add_manually|flatdarks_add_manually|integrated_lights'
     r'|force_file_name_filter|skip_autodetect_filter|skip_autodetect_imagetyp)$', 'files'),
    (r'^(create_superbias|bias_|pre_calibrate_darks|optimize_darks|dark_master_files'
     r'|flat_dark_master_files|flat_master_files|stars_in_flats|use_darks_on_flat_calibrate'
     r'|auto_output_pedestal|output_pedestal|debayer_pattern|extract_channel_mapping)',
     'calibration'),
    (r'^(fix_column_defects|fix_row_defects|skip_cosmeticcorrection|cosmetic_correction_'
     r'|banding_reduction)', 'cosmetic'),
    (r'^(skip_subframeselector|use_weight|ssweight_limit|sort_order_type|filter_limit|outliers_'
     r'|use_imageintegration_ssweight)', 'quality'),
    (r'^(staralignment_|comet_|binning|use_drizzle|drizzle_|crop_)', 'registration'),
    (r'^(local_normalization|use_localnormalization_multiscale|imageintegration_normalization'
     r'|integration_combination|use_clipping|skip_imageintegration_clipping|percentile_|sigma_'
     r'|winsorised_cutoff|linearfit_|ESD_|large_scale_pixel_rejection|use_fastintegration'
     r'|fastintegration_)', 'integration'),
    (r'^(GC_|use_GC_|gc_|mgc_|ABE_|dbe_|use_abe|use_dbe|use_multiscalegradientcorrection'
     r'|use_graxpert$|graxpert_(path|correction|smoothing)|smoothbackground$)', 'gradient'),
    (r'^(use_graxpert_denoise|graxpert_denoise_)', 'noise'),
    (r'^(use_graxpert_deconvolution|graxpert_deconvolution_|graxpert_median_psf'
     r'|use_blurxterminator|bxt_|skip_sharpening)', 'sharpen'),
    (r'^(skip_color_calibration|skip_auto_background|use_spcc|spcc_|use_background_neutralization'
     r'|color_calibration_|solve_image|target_)', 'colorcal'),
    (r'^(image_stretching|STF_targetBackground|MaskedStretch_|Arcsinh_|MAS_|veralux_'
     r'|histogram_stretch_|other_stretch_target|stretch_adjust_shadows)', 'stretch'),
    (r'^(auto_noise_reduction|channel_noise_reduction|non_linear_noise_reduction'
     r'|noise_reduction_strength|luminance_noise_reduction_strength|combined_image_noise_reduction'
     r'|processed_image_noise_reduction|use_color_noise_reduction|use_ACDNR_noise_reduction'
     r'|ACDNR_noise_reduction|skip_noise_reduction|skip_star_noise_reduction|use_noisexterminator'
     r'|nxt_|use_deepsnr|deepsnr_)', 'noise'),
    (r'^(use_starxterminator|use_starnet2|starxterminator_|unscreen_stars|remove_stars_'
     r'|create_RGB_stars|stars_stretching|stars_combine|skip_mask_contrast|force_new_mask)',
     'stars'),
    (r'^(narrowband_|custom_[RGBL]_mapping|mapping_on_nonlinear_data|force_narrowband_mapping'
     r'|use_narrowband_multiple_mappings)', 'narrowband'),
    (r'^(RGBHa_|use_RGBHa_Mapping)', 'hargb'),
    (r'^(RGBNB_|use_RGBNB_Mapping)', 'nbrgb'),
    (r'^(LRGBCombination_|linear_increase_saturation|non_linear_increase_saturation'
     r'|use_chrominance|use_linear_fit|STF_linking|skip_SCNR)', 'lrgb'),
    (r'^(enhancements_remove_stars|enhancements_unscreen_stars|enhancements_fix_star_cores'
     r'|enhancements_combine_stars|enhancements_star_noise_reduction|enhancements_smaller_stars'
     r'|fix_narrowband_star_color|skip_star_fix_mask)', 'enh_stars'),
    (r'^enhancements_(darker_background|darker_highlights|ET|HDRMLT|LHE|contrast|auto_contrast'
     r'|stretch|autostf|shadowclipping|shadow_enhance|highlight_enhance|gamma|curves)',
     'enh_light'),
    (r'^(enhancements_(selective_color|saturation|less_saturation|normalize_channels'
     r'|adjust_channels|adjust_[RGB]|color_calibration|ha_mapping|highlight_color'
     r'|narrowband_mapping)|run_foraxx_mapping|foraxx_palette|run_enhancements_narrowband_mapping'
     r'|run_orangeblue_colors|run_orange_hue_shift|run_hue_shift|leave_some_green'
     r'|run_narrowband_SCNR|remove_magenta_color)', 'enh_color'),
    (r'^enhancements_(noise_reduction|ACDNR|color_noise|sharpen|unsharpmask|highpass_sharpen'
     r'|clarity)', 'enh_detail'),
    (r'^enhancements_', 'enh_other'),
    (r'^crop_to_common_area$', 'registration'),
]

DEFAULT_GROUP = 'runmodes'


# ---------------------------------------------------------------------------
# Tags. Every option is either processing or interface, the other tags are
# optional and tell what kind of data the option applies to.
# ---------------------------------------------------------------------------

TAGINFO = {
    'processing': ('Processing', 'Changes the processed image.'),
    'interface':  ('Interface',
                   'Affects only the user interface, files on disk or logging, not the image.'),
    'color':      ('Color image', 'Applies to color images, both OSC/DSLR data and RGB '
                                 'combined from mono channels.'),
    'osc':        ('OSC / RAW', 'Applies only to undebayered OSC, DSLR or RAW data.'),
    'narrowband': ('Narrowband', 'Applies to narrowband data or narrowband palettes.'),
    'mono':       ('Mono / LRGB', 'Applies to mono data with separate filter channels.'),
    'tool':       ('External tool',
                   'Needs a separate PixInsight process or program: BlurXTerminator, '
                   'NoiseXTerminator, StarXTerminator, StarNet2, DeepSNR or GraXpert.'),
}
TAG_ORDER = ['processing', 'interface', 'color', 'osc', 'narrowband', 'mono', 'tool']

# Tags interface, color, osc, narrowband and mono come from the applies field of
# the option in this.par, see AutoIntegrateGlobal.js. An option with no applies
# field is a processing option that is not specific to any data type.
#
# The external tool tag is recognized from the option name.
TOOL_RE = re.compile(r'(blurxterminator|^bxt_|noisexterminator|^nxt_|starxterminator|starnet2'
                     r'|deepsnr|graxpert)')


# ---------------------------------------------------------------------------
# Source parsing helpers
# ---------------------------------------------------------------------------

STR = r'"(?:[^"\\\n]|\\.)*"'
SQSTR = r"'(?:[^'\\\n]|\\.)*'"
RUN = re.compile(r'(?:' + STR + r'\s*(?:\+\s*)?)+')
PAR = re.compile(r'\bpar\.([A-Za-z_][A-Za-z0-9_]*)\b')
DOTTED = r'[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*'
IDENT = re.compile(r'\b(' + DOTTED + r')\b')
LHS = re.compile(r'(?:^|[;{}\n])\s*(?:var|let|const)?\s*(' + DOTTED + r')\s*=[^=]')
ARRAY = re.compile(r'(' + DOTTED + r')\s*=\s*\[((?:\s*(?:' + STR + r'|' + SQSTR + r')\s*,?)+)\]')
TIPISH = re.compile(r'([Tt]ool[Tt]ip|[Tt]ip|TT)s?$')
OPTION = re.compile(r'^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*\{(.*?)\},?\s*(//.*)?$')


def read_source(srcdir, name):
    with open(os.path.join(srcdir, name), encoding='utf-8', errors='replace') as f:
        return f.read()


def norm_name(name):
    """Drop the object prefix so that this.xLabel and xLabel are the same name."""
    return re.sub(r'^(this\.|parent\.|dialog\.)+', '', name)


def join_strings(text):
    """Return the contents of a "a" + "b" string concatenation."""
    out = ''
    for part in re.findall(STR, text):
        out += part[1:-1].replace('\\"', '"').replace('\\n', ' ').replace("\\'", "'")
    return out


def tooltip_to_text(tip):
    """Convert a tooltip that uses simple HTML into plain text."""
    tip = re.sub(r'</p>\s*<p>', '\n\n', tip)
    tip = re.sub(r'<br\s*/?>', '\n', tip)
    tip = re.sub(r'<li>', '\n- ', tip)
    tip = re.sub(r'<[^>]+>', '', tip)
    tip = html.unescape(tip)
    tip = re.sub(r'[ \t]+', ' ', tip)
    tip = re.sub(r'\n\s*\n\s*', '\n\n', tip)
    return tip.strip()


def statement_end(text, start):
    """Index of the first ';' after start that is not inside a string."""
    i, n = start, len(text)
    while i < n:
        c = text[i]
        if c in '"\'':
            quote = c
            i += 1
            while i < n and text[i] != quote:
                if text[i] == '\\':
                    i += 1
                i += 1
        elif c == ';':
            return i
        i += 1
    return n


def is_tooltip(text):
    """Guess if a string literal is a tooltip and not a label or a value."""
    text = text.strip()
    if len(text) < 13 or ' ' not in text:
        return False
    return ('<' in text and '>' in text) or text.endswith('.') or len(text) >= 30


# ---------------------------------------------------------------------------
# Reading the option list from AutoIntegrateGlobal.js
# ---------------------------------------------------------------------------

def parse_options(srcdir):
    """Return the options of this.par as a list of dictionaries."""
    text = read_source(srcdir, GLOBAL_FILE)
    start = text.find('this.par = {')
    if start < 0:
        sys.exit('Could not find this.par in ' + GLOBAL_FILE)
    # find the end of the object
    depth, i = 0, text.index('{', start)
    end = len(text)
    while i < len(text):
        if text[i] == '{':
            depth += 1
        elif text[i] == '}':
            depth -= 1
            if depth == 0:
                end = i
                break
        i += 1
    options = []
    for line in text[start:end].split('\n'):
        stripped = line.strip()
        if stripped.startswith('//'):
            continue
        m = OPTION.match(line)
        if not m:
            continue
        key, body = m.group(1), m.group(2)
        name = re.search(r'name\s*:\s*"((?:[^"\\]|\\.)*)"', body)
        vtype = re.search(r"type\s*:\s*'(\w)'", body)
        default = re.search(r'def\s*:\s*(.+?),\s*name', body)
        applies = re.search(r'applies\s*:\s*"([^"]*)"', body)
        options.append({
            'key': key,
            'label': name.group(1) if name else key,
            'type': vtype.group(1) if vtype else '?',
            'def': default.group(1).strip() if default else '',
            'applies': applies.group(1) if applies else '',
        })
    return options


def parse_version(srcdir):
    text = read_source(srcdir, GLOBAL_FILE)
    m = re.search(r'autointegrate_version\s*=\s*"([^"]*)"', text)
    return m.group(1) if m else 'AutoIntegrate'


# ---------------------------------------------------------------------------
# Reading tooltips and combo box values from the GUI sources
# ---------------------------------------------------------------------------

def parse_value_arrays(srcdir):
    """Return name -> list of values for the *_values arrays used by combo boxes."""
    values = {}
    for name in GUI_FILES + [GLOBAL_FILE]:
        text = read_source(srcdir, name)
        for m in ARRAY.finditer(text):
            var = norm_name(m.group(1))
            items = [x[1:-1] for x in re.findall(STR + '|' + SQSTR, m.group(2))]
            if 1 < len(items) <= 40 and var not in values:
                values[var] = items
    return values


def parse_tooltips(srcdir, values):
    """Find a tooltip and the possible values for every option used in the GUI.

    Tooltips are given to the GUI helper functions in several ways: as a string
    in the same statement, as a variable, or as a reference to the tooltip of
    another control like someLabel.toolTip. All of these are resolved here. When
    a variable is used the nearest definition before the use is selected, so
    generic names like lbl.toolTip work too.
    """
    tips, valmap, loose = {}, {}, {}
    texts, assignments = {}, {}

    for name in GUI_FILES:
        text = read_source(srcdir, name)
        texts[name] = text
        amap = {}
        for m in LHS.finditer(text):
            var = norm_name(m.group(1))
            if var.endswith('.text'):
                continue
            end = statement_end(text, m.end())
            runs = [join_strings(r.group(0)) for r in RUN.finditer(text[m.end():end])]
            joined = ' '.join(r for r in runs if is_tooltip(r))
            if is_tooltip(joined):
                amap.setdefault(var, []).append((m.start(), joined))
        assignments[name] = amap

    # tooltips defined in another file, used when the name is not in this file
    shared = {}
    for name in GUI_FILES:
        for var, lst in assignments[name].items():
            shared.setdefault(var, lst[-1][1])

    def lookup(fname, var, pos):
        lst = assignments[fname].get(var)
        if lst:
            idx = bisect.bisect_left([p for p, _ in lst], pos) - 1
            return lst[idx][1] if idx >= 0 else lst[0][1]
        return shared.get(var)

    for fname in GUI_FILES:
        text = texts[fname]
        uses = list(PAR.finditer(text))
        for i, m in enumerate(uses):
            key = m.group(1)
            span = text[m.end():statement_end(text, m.end())]

            found = None
            for r in RUN.finditer(span):
                candidate = join_strings(r.group(0))
                if is_tooltip(candidate):
                    found = candidate
                    break
            if not found:
                for im in IDENT.finditer(span):
                    var = norm_name(im.group(1))
                    if not TIPISH.search(var):
                        continue
                    base = var[:-len('.toolTip')] if var.endswith('.toolTip') else var
                    names = [var, base]
                    for nm in (var, base):
                        parts = nm.split('.')
                        if len(parts) > 1:
                            names.append('.'.join(parts[1:]))
                    for nm in names:
                        if nm in ('toolTip', 'tip', 'ToolTip'):
                            continue
                        found = lookup(fname, nm, m.start())
                        if found:
                            break
                    if found:
                        break
            if found:
                tip = tooltip_to_text(found)
                if len(tip) > len(tips.get(key, '')):
                    tips[key] = tip

            if key not in valmap:
                for im in IDENT.finditer(span):
                    var = norm_name(im.group(1))
                    if (var.endswith('_values') or var.endswith('_valuestxt')) and var in values:
                        valmap[key] = values[var]
                        break
                else:
                    arr = re.search(r'\[\s*((?:(?:' + STR + '|' + SQSTR + r')\s*,\s*)+(?:'
                                    + STR + '|' + SQSTR + r'))\s*\]', span)
                    if arr:
                        items = [x[1:-1] for x in re.findall(STR + '|' + SQSTR, arr.group(1))]
                        if 1 < len(items) <= 40:
                            valmap[key] = items

            if not found:
                # No tooltip in this statement, use the next tooltip like text
                # that follows the option. This is less reliable and is only
                # used when nothing better is found.
                end = min(uses[i + 1].start() if i + 1 < len(uses) else len(text), m.end() + 1200)
                for r in RUN.finditer(text[m.end():end]):
                    candidate = join_strings(r.group(0))
                    if is_tooltip(candidate) and len(candidate) > 45:
                        tip = tooltip_to_text(candidate)
                        if len(tip) > len(loose.get(key, '')):
                            loose[key] = tip
                        break

    return tips, loose, valmap


def parse_tooltips_before(srcdir, keys):
    """Last resort: the tooltip like text just before the option is used.

    Some options, for example the AstroBin filter numbers, share a tooltip that
    is given to a label created before the control.
    """
    found = {}
    for name in GUI_FILES:
        text = read_source(srcdir, name)
        for m in PAR.finditer(text):
            key = m.group(1)
            if key not in keys:
                continue
            before = text[max(0, m.start() - 1200):m.start()]
            cands = [join_strings(r.group(0)) for r in RUN.finditer(before)]
            cands = [c for c in cands if len(c) > 30 and is_tooltip(c)]
            if cands:
                tip = tooltip_to_text(cands[-1])
                if len(tip) > len(found.get(key, '')):
                    found[key] = tip
    return found


# ---------------------------------------------------------------------------
# Grouping and tagging
# ---------------------------------------------------------------------------

def group_of(key):
    for pattern, group in RULES:
        if re.search(pattern, key):
            return group
    return DEFAULT_GROUP


def tags_of(key, applies):
    """Return the tags of an option from its applies field and from its name."""
    words = applies.split()
    unknown = [w for w in words if w not in TAGINFO or w == 'processing']
    if unknown:
        print('Warning: option %s has unknown applies values: %s' % (key, ' '.join(unknown)))
    tags = [t for t in TAG_ORDER if t in words]
    if 'interface' not in tags:
        tags.insert(0, 'processing')
    if TOOL_RE.search(key) and 'tool' not in tags:
        tags.append('tool')
    return tags


def load_metadata(srcdir):
    """Return the option metadata written by AutoIntegrate as key -> option, or None."""
    path = os.path.join(srcdir, METADATA_FILE)
    if not os.path.isfile(path):
        return None
    with open(path, encoding='utf-8') as f:
        data = json.load(f)
    return {o['key']: o for o in data.get('options', [])}


def metadata_version(srcdir):
    path = os.path.join(srcdir, METADATA_FILE)
    if not os.path.isfile(path):
        return None
    with open(path, encoding='utf-8') as f:
        return json.load(f).get('version', '')


def apply_metadata(options, meta):
    """Merge the metadata from the GUI into the options read from the sources.

    The sources give the list of options, the metadata gives the descriptions and
    everything else that is known only when the GUI has been built. Options that
    are not in the metadata keep the values that were read from the sources, so
    an out of date metadata file does not drop options from the page.
    """
    stale = []
    for o in options:
        m = meta.get(o['key'])
        if m is None:
            stale.append(o['key'])
            o['expert'] = None
            o['in_gui'] = None
            continue
        if m.get('applies'):
            o['applies'] = m['applies']
            o['tags'] = tags_of(o['key'], o['applies'])
        o['expert'] = m.get('expert', True)
        o['in_gui'] = m.get('in_gui', False)
        o['tabs'] = m.get('tabs', [])
        o['sections'] = m.get('sections', [])
        if m.get('tooltip'):
            o['tip'] = tooltip_to_text(m['tooltip'])
        if m.get('tip'):
            o['tip'] = tooltip_to_text(m['tip'])
        if m.get('values'):
            o['values'] = m['values']
        if m.get('def') is not None:
            o['default'] = format_default(m['def'])
    return stale


def format_default(value):
    """Format a default value from the metadata the same way as in the sources."""
    if isinstance(value, bool):
        return 'true' if value else 'false'
    if isinstance(value, (dict, list)):
        return json.dumps(value)
    return str(value)


def collect(srcdir, meta=None):
    """Read the sources and return the options with descriptions, groups and tags."""
    options = [o for o in parse_options(srcdir) if o['key'] not in SKIP_OPTIONS]
    values = parse_value_arrays(srcdir)
    tips, loose, valmap = parse_tooltips(srcdir, values)

    missing = {o['key'] for o in options
               if o['key'] not in tips and o['key'] not in loose
               and o['key'] not in TIP_OVERRIDE}
    before = parse_tooltips_before(srcdir, missing) if missing else {}

    for o in options:
        key = o['key']
        o['tip'] = TIP_OVERRIDE.get(key) or tips.get(key) or loose.get(key) or before.get(key, '')
        o['values'] = valmap.get(key, [])
        o['group'] = group_of(key)
        o['tags'] = tags_of(key, o['applies'])
        o['typename'] = TYPE_NAMES.get(o['type'], o['type'])
        default = str(o['def']).strip().strip(',')
        if default.startswith('this.'):
            default = DEFAULT_OVERRIDE.get(default, '')
        o['default'] = default.strip('"\'')
        o['expert'] = None
        o['in_gui'] = None
        o['tabs'] = []
        o['sections'] = []

    if meta:
        stale = apply_metadata(options, meta)
        if stale:
            print('Warning: %d options are not in %s, it may be out of date: %s'
                  % (len(stale), METADATA_FILE, name_list(stale)))
        extra = sorted(set(meta) - {o['key'] for o in options} - SKIP_OPTIONS)
        if extra:
            print('Warning: %d options in %s are not in the sources: %s'
                  % (len(extra), METADATA_FILE, name_list(extra)))
    return options


def name_list(names, limit=12):
    """Format a list of option names for a message, without filling the screen."""
    names = sorted(names)
    if len(names) <= limit:
        return ', '.join(names)
    return '%s and %d more' % (', '.join(names[:limit]), len(names) - limit)


# ---------------------------------------------------------------------------
# HTML output
# ---------------------------------------------------------------------------

def esc(text):
    return html.escape(str(text), quote=True)


def description_html(tip):
    """Format a plain text description into paragraphs and lists."""
    if not tip:
        return '<span class="nodesc">No description available.</span>'
    out = []
    for block in [b.strip() for b in tip.split('\n\n') if b.strip()]:
        paragraph, items = [], []
        for line in block.split('\n'):
            line = line.strip()
            if line.startswith('- '):
                items.append(line[2:].strip())
            else:
                if items:
                    out.append('<ul>' + ''.join('<li>%s</li>' % esc(i) for i in items) + '</ul>')
                    items = []
                if line:
                    paragraph.append(line)
        if paragraph:
            out.append('<p>%s</p>' % esc(' '.join(paragraph)))
        if items:
            out.append('<ul>' + ''.join('<li>%s</li>' % esc(i) for i in items) + '</ul>')
    return ''.join(out)


PAGE = '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__PAGETITLE__</title>
<style>
* { box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; margin: 0; color: #222; background: #fff;
       font-size: 15px; line-height: 1.5; }
a { color: #0b7285; }
.header { background: #1abc9c; color: #fff; padding: 22px 20px 18px; }
.header h1 { margin: 0 0 4px; font-size: 26px; }
.header p { margin: 0; opacity: .95; font-size: 14px; }
.wrap { max-width: 1400px; margin: 0 auto; padding: 0 20px 60px; }
.intro { background: whitesmoke; border: 1px solid #e2e2e2; padding: 14px 18px; margin: 20px 0; }
.intro h2, .toc h2 { font-size: 17px; margin: 0 0 8px; }
.intro ul { margin: 6px 0 0; padding-left: 0; list-style: none; }
.intro li { margin: 5px 0; font-size: 14px; }
.stats { margin: 10px 0 0; font-size: 14px; color: #555; }
.toc { margin: 20px 0; }
.toclist { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 6px; }
.toclist a { display: flex; justify-content: space-between; gap: 10px; background: whitesmoke;
             border: 1px solid #e6e6e6; padding: 7px 10px; text-decoration: none; font-size: 14px; }
.toclist a:hover { background: #e8f8f4; border-color: #1abc9c; }
.toclist a span { color: #777; }
.tools { position: sticky; top: 0; z-index: 5; background: #fff; border-bottom: 1px solid #ddd;
         padding: 10px 0; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
#q { flex: 1 1 260px; min-width: 220px; padding: 8px 10px; border: 1px solid #bbb; font-size: 14px; }
.fbtn { padding: 7px 11px; border: 1px solid #bbb; background: #fff; cursor: pointer; font-size: 13px; }
.fbtn:hover { border-color: #1abc9c; }
.fbtn.on { background: #1abc9c; border-color: #16a085; color: #fff; }
#reset { padding: 7px 11px; border: 1px solid #bbb; background: #fff; cursor: pointer; font-size: 13px; }
#hits { font-size: 13px; color: #666; margin-left: auto; }
h2 { font-size: 20px; margin: 34px 0 4px; padding-bottom: 6px; border-bottom: 2px solid #1abc9c; }
h2 .count { font-size: 13px; color: #777; font-weight: normal; }
.blurb { margin: 0 0 10px; color: #555; font-size: 14px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: .04em;
     color: #555; background: whitesmoke; border-bottom: 1px solid #ddd; padding: 7px 10px; }
td { border-bottom: 1px solid #eee; padding: 10px; vertical-align: top; }
tr:hover td { background: #fafcfc; }
.c-opt { width: 22%; }
.c-meta { width: 12%; }
.oname { display: block; font-weight: bold; }
.key { display: inline-block; margin-top: 4px; font-size: 12px; color: #666; background: whitesmoke;
       padding: 1px 5px; border: 1px solid #eee; word-break: break-all; }
.ty { display: block; font-size: 13px; color: #444; }
.df { display: block; font-size: 13px; color: #777; margin-top: 3px; }
.c-desc p { margin: 0 0 7px; }
.c-desc p:last-child { margin-bottom: 0; }
.c-desc ul { margin: 0 0 7px; padding-left: 20px; }
.c-desc li { margin: 2px 0; }
.vals { font-size: 13px; color: #555; }
.vals span { color: #888; }
.vals code, .c-desc code { background: whitesmoke; border: 1px solid #eee; padding: 0 4px; font-size: 12px; }
.nodesc { color: #999; font-style: italic; }
.tag { display: inline-block; font-size: 11px; padding: 1px 6px; margin: 4px 4px 0 0;
       border: 1px solid; border-radius: 2px; white-space: nowrap; }
.t-processing { color: #0b6e4f; border-color: #9ed9c3; background: #eafaf4; }
.t-interface  { color: #555; border-color: #d5d5d5; background: #f4f4f4; }
.t-color      { color: #9c4221; border-color: #f0c0a0; background: #fdf2ea; }
.t-osc        { color: #8a5000; border-color: #f0d49c; background: #fdf6e6; }
.t-narrowband { color: #6b3fa0; border-color: #d6c4ee; background: #f6f1fd; }
.t-mono       { color: #1f5f8b; border-color: #b3d3ea; background: #eff6fb; }
.t-tool       { color: #7a4b00; border-color: #e4cfa8; background: #faf5eb; }
.legend { list-style: none; padding: 0; margin: 8px 0 0; font-size: 13px; }
.legend li { margin: 4px 0; }
.footer { border-top: 1px solid #ddd; margin-top: 40px; padding: 14px 0; color: #777; font-size: 13px; }
.hidden { display: none !important; }
@media (max-width: 800px) {
  .c-opt, .c-meta { width: auto; }
  table, thead, tbody, tr, td, th { display: block; }
  thead { display: none; }
  tr { border-bottom: 1px solid #ddd; padding: 6px 0; }
  td { border: 0; padding: 4px 0; }
}
</style>
</head>
<body>
<div class="header">
  <h1>__PAGETITLE__</h1>
  <p>__SUBTITLE__</p>
</div>
<div class="wrap">

<div class="intro">
  <h2>How to read this page</h2>
  <p>Every option is listed with the setting name that is used in saved setups and process icons, the
  internal parameter name used in JSON setup files, the value type and the default value. Descriptions
  are the tooltip texts from the script itself. Each option is tagged so you can tell at a glance whether
  it changes the processed image or only the way the script works.</p>
  <p>Use the search box to find an option by name or by words in its description, and the buttons to
  show only the options of a certain kind. Selecting several buttons shows the options that have all
  of the selected tags.</p>
  __CROSSLINK__
  <ul class="legend">__LEGEND__</ul>
  <p class="stats">__NPROC__ options change processing, __NINT__ options affect only the interface,
  files or logging. __NCOL__ options apply to color images and __NNB__ options are
  specific to narrowband data.</p>
</div>

<div class="toc">
  <h2>Groups</h2>
  <div class="toclist">__TOC__</div>
</div>

<div class="tools">
  <input id="q" type="search" placeholder="Search options, parameter names and descriptions...">
  __FILTERS__
  <button id="reset">Clear</button>
  <span id="hits"></span>
</div>

__ROWS__

<div class="footer">
  Generated from the AutoIntegrate source code (__VERSION__) on __DATE__.
  Descriptions come from the tooltips in the script.
</div>
</div>
<script>
(function () {
  var q = document.getElementById('q');
  var hits = document.getElementById('hits');
  var rows = Array.prototype.slice.call(document.querySelectorAll('tbody tr'));
  var sections = Array.prototype.slice.call(document.querySelectorAll('section.group'));
  var active = {};

  function apply() {
    var text = q.value.trim().toLowerCase();
    var words = text ? text.split(/\\s+/) : [];
    var tags = Object.keys(active).filter(function (t) { return active[t]; });
    var n = 0;
    rows.forEach(function (tr) {
      var hay = tr.getAttribute('data-search');
      var rtags = tr.getAttribute('data-tags').split(' ');
      var ok = words.every(function (w) { return hay.indexOf(w) >= 0; }) &&
               tags.every(function (t) { return rtags.indexOf(t) >= 0; });
      tr.classList.toggle('hidden', !ok);
      if (ok) { n++; }
    });
    sections.forEach(function (s) {
      var any = s.querySelector('tbody tr:not(.hidden)');
      s.classList.toggle('hidden', !any);
    });
    hits.textContent = n + ' of ' + rows.length + ' options';
  }

  q.addEventListener('input', apply);
  document.querySelectorAll('.fbtn').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.getAttribute('data-tag');
      active[t] = !active[t];
      b.classList.toggle('on', active[t]);
      apply();
    });
  });
  document.getElementById('reset').addEventListener('click', function () {
    q.value = '';
    active = {};
    document.querySelectorAll('.fbtn').forEach(function (b) { b.classList.remove('on'); });
    apply();
  });
  apply();
})();
</script>
</body>
</html>
'''


SIMPLE_TITLE = 'AutoIntegrate Simple Mode Options'
FULL_TITLE = 'AutoIntegrate Options Reference'

SIMPLE_LINK = ('<p>This page lists only the options that are shown in simple mode. It is a good '
               'place to start, the rest of the options are in the '
               '<a href="%s">full options reference</a>.</p>' % DEFAULT_OUTPUT)
FULL_LINK = ('<p>This page lists all options. If you are starting with the script, the shorter '
             '<a href="%s">simple mode options</a> page lists only the options that are shown '
             'in simple mode.</p>' % DEFAULT_SIMPLE_OUTPUT)


def build_page(options, version, simple=False, have_metadata=True):
    bygroup = {}
    for o in options:
        bygroup.setdefault(o['group'], []).append(o)

    rows = []
    for gid, title, blurb in GROUPS:
        lst = bygroup.get(gid, [])
        if not lst:
            continue
        rows.append('<section class="group" id="%s" data-count="%d">' % (gid, len(lst)))
        rows.append('<h2>%s <span class="count">%d</span></h2>' % (esc(title), len(lst)))
        rows.append('<p class="blurb">%s</p>' % esc(blurb))
        rows.append('<table><thead><tr><th class="c-opt">Option / setting name</th>'
                    '<th class="c-meta">Type / default</th>'
                    '<th class="c-desc">Description</th></tr></thead><tbody>')
        for o in lst:
            badges = ''.join('<span class="tag t-%s">%s</span>' % (t, esc(TAGINFO[t][0]))
                             for t in TAG_ORDER if t in o['tags'])
            default = o['default']
            if default == '':
                default = '&mdash;'
            elif default in ('true', 'false'):
                default = 'checked' if default == 'true' else 'unchecked'
            else:
                default = esc(default)
            vals = ''
            if o['values']:
                vals = '<p class="vals"><span>Values:</span> %s</p>' % ', '.join(
                    '<code>%s</code>' % esc(v if v != '' else '(empty)') for v in o['values'])
            search = re.sub(r'\s+', ' ',
                            ' '.join([o['label'], o['key'], o['tip'][:400]])).lower()
            rows.append(
                '<tr data-tags="%s" data-search="%s">'
                '<td class="c-opt"><span class="oname">%s</span>%s<code class="key">%s</code></td>'
                '<td class="c-meta"><span class="ty">%s</span><span class="df">%s</span></td>'
                '<td class="c-desc">%s%s</td></tr>'
                % (' '.join(o['tags']), esc(search), esc(o['label']), badges, esc(o['key']),
                   esc(o['typename']), default, description_html(o['tip']), vals))
        rows.append('</tbody></table></section>')

    toc = '\n'.join(
        '<a href="#%s">%s<span>%d</span></a>' % (gid, esc(title), len(bygroup.get(gid, [])))
        for gid, title, _ in GROUPS if bygroup.get(gid))
    legend = ''.join(
        '<li><span class="tag t-%s">%s</span> %s</li>' % (t, esc(TAGINFO[t][0]), esc(TAGINFO[t][1]))
        for t in TAG_ORDER)
    filters = ''.join(
        '<button class="fbtn" data-tag="%s">%s</button>' % (t, esc(TAGINFO[t][0]))
        for t in TAG_ORDER)

    def count(tag):
        return str(sum(1 for o in options if tag in o['tags']))

    if simple:
        subtitle = ('The %d options of %s that are shown in simple mode.'
                    % (len(options), version))
    else:
        subtitle = 'All %d options of %s, grouped by what they do.' % (len(options), version)

    crosslink = ''
    if have_metadata:
        crosslink = SIMPLE_LINK if simple else FULL_LINK

    return (PAGE.replace('__ROWS__', '\n'.join(rows))
                .replace('__TOC__', toc)
                .replace('__LEGEND__', legend)
                .replace('__FILTERS__', filters)
                .replace('__PAGETITLE__', esc(SIMPLE_TITLE if simple else FULL_TITLE))
                .replace('__SUBTITLE__', esc(subtitle))
                .replace('__CROSSLINK__', crosslink)
                .replace('__TOTAL__', str(len(options)))
                .replace('__NPROC__', count('processing'))
                .replace('__NINT__', count('interface'))
                .replace('__NCOL__', count('color'))
                .replace('__NNB__', count('narrowband'))
                .replace('__DATE__', datetime.date.today().isoformat())
                .replace('__VERSION__', esc(version)))


# ---------------------------------------------------------------------------

def print_stats(options):
    bygroup = {}
    for o in options:
        bygroup.setdefault(o['group'], []).append(o)
    print('Options: %d' % len(options))
    for gid, title, _ in GROUPS:
        print('%4d  %s' % (len(bygroup.get(gid, [])), title))
    for tag in TAG_ORDER:
        print('%4d  tag %s' % (sum(1 for o in options if tag in o['tags']), tag))
    nodesc = [o['key'] for o in options if not o['tip']]
    print('%4d  without a description%s' % (len(nodesc),
                                            ': ' + ', '.join(nodesc) if nodesc else ''))
    if any(o['expert'] is not None for o in options):
        print('%4d  shown in simple mode' % sum(1 for o in options if o['expert'] is False))
        print('%4d  shown in expert mode only' % sum(1 for o in options if o['expert'] is True))
        nogui = [o['key'] for o in options if o['in_gui'] is False]
        print('%4d  with no GUI control%s' % (len(nogui),
                                              ': ' + ', '.join(nogui) if nogui else ''))


def main():
    ap = argparse.ArgumentParser(description='Generate the AutoIntegrate options reference page.')
    ap.add_argument('-o', '--output', default=DEFAULT_OUTPUT, help='output HTML file')
    ap.add_argument('-s', '--srcdir', default=os.path.dirname(os.path.abspath(__file__)),
                    help='directory with the AutoIntegrate sources')
    ap.add_argument('--stats', action='store_true', help='print group and tag counts')
    ap.add_argument('--json', metavar='FILE', help='also write the option data as JSON')
    ap.add_argument('--simple', action='store_true',
                    help='generate the simple mode options page, needs ' + METADATA_FILE)
    ap.add_argument('--no-metadata', action='store_true',
                    help='ignore ' + METADATA_FILE + ' and read everything from the sources')
    args = ap.parse_args()

    for name in [GLOBAL_FILE] + GUI_FILES:
        if not os.path.isfile(os.path.join(args.srcdir, name)):
            sys.exit('Missing source file: ' + os.path.join(args.srcdir, name))

    meta = None if args.no_metadata else load_metadata(args.srcdir)
    version = parse_version(args.srcdir)
    if meta is None:
        if args.simple:
            sys.exit('The simple mode page needs %s. Write it from the AutoIntegrate GUI with the '
                     'Write options metadata button in the Interface tab, Debug settings section.'
                     % os.path.join(args.srcdir, METADATA_FILE))
        print('Note: %s not found, generating from the sources only.' % METADATA_FILE)
    else:
        meta_version = metadata_version(args.srcdir)
        if meta_version != version:
            print('Warning: %s was written by %s but the sources are %s, it should be written again.'
                  % (METADATA_FILE, meta_version, version))

    options = collect(args.srcdir, meta)
    if args.simple:
        options = [o for o in options if o['in_gui'] and not o['expert']]
        if args.output == DEFAULT_OUTPUT:
            args.output = DEFAULT_SIMPLE_OUTPUT
    page = build_page(options, version, simple=args.simple, have_metadata=meta is not None)

    with open(args.output, 'w', encoding='utf-8') as f:
        f.write(page)
    print('Wrote %s, %d options from %s' % (args.output, len(options), version))

    if args.json:
        with open(args.json, 'w', encoding='utf-8') as f:
            json.dump(options, f, indent=1)
        print('Wrote ' + args.json)

    if args.stats:
        print_stats(options)


if __name__ == '__main__':
    main()
