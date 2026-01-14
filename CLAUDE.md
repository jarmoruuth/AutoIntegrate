# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AutoIntegrate is a PixInsight script (JavaScript/PJSR) that automates initial steps of astronomical image processing. It processes FITS, RAW, and other image formats including LRGB, color/OSC/DSLR, and narrowband files. The script performs calibration, image integration, star alignment, and post-processing enhancements.

## Running and Testing

This is a PixInsight script - no npm/build system. Scripts run directly in PixInsight's JavaScript runtime.

**Run the script:**
- Open `AutoIntegrate.js` in PixInsight Script Editor, press F9
- Or via command line: `run --execute-mode=auto "path/to/AutoIntegrate.js"`

**Testing:**
```bash
# Run with test suite (requires separate TestAutoIntegrate repository)
run -a="autotest_tests_default.txt" --execute-mode=auto "path/to/TestAutoIntegrate/FullProcessing/TestFullProcessing.js"

# Headless mode (no settings persistence)
run -a="do_not_read_settings" -a="do_not_write_settings" --execute-mode=auto "path/to/AutoIntegrate.js"

# Reset PixInsight
run --reset
```

## Architecture

The codebase uses a modular architecture with dependency injection. All modules are loaded via `#include` directives in the main entry point.

**Module initialization chain (AutoIntegrate.js):**
```javascript
var global = new AutoIntegrateGlobal();
var util = new AutoIntegrateUtil(global);
var flowchart = new AutoIntegrateFlowchart(global, util);
var engine = new AutoIntegrateEngine(global, util, flowchart);
var gui = new AutoIntegrateGUI(global, util, engine, flowchart);
```

**Core modules:**

| Module | Responsibility |
|--------|---------------|
| `AutoIntegrateGlobal.js` | Global state, configuration parameters (`this.par`), persistent settings (`this.ppar`), stretching options, narrowband palettes |
| `AutoIntegrateEngine.js` | Main processing engine - calibration, integration, alignment, enhancements (largest module ~19K lines) |
| `AutoIntegrateGUI.js` | Main user interface - file selection, options, progress display |
| `AutoIntegrateUtil.js` | Utility functions, PixInsight process wrappers, logging |
| `AutoIntegrateGUITools.js` | GUI helper components and UI builders |
| `AutoIntegrateEnhancementsGUI.js` | Post-processing enhancements UI |
| `AutoIntegrateFlowchart.js` | Processing workflow visualization |
| `AutoIntegrateLDD.js` | Linear Defect Detection |
| `AutoIntegrateBanding.js` | Banding pattern correction |
| `AutoIntegratePreview.js` | Image preview functionality |

**Independent scripts:**

These are standalone PixInsight scripts that reuse AutoIntegrate modules via `#include`. Each has its own entry point and GUI but shares core functionality:

- `ImageStretching.js` - Standalone image stretching tool
- `GradientCorrection.js` - Standalone gradient correction tool
- `ImageEnhancements.js` - Standalone image enhancement tool
- `NarrowbandCombinations.js` - Standalone narrowband palette mixer
- `SelectiveColor.js` - Standalone Photoshop-style selective color adjustments

## Processing Pipeline

1. File selection (lights, calibration frames)
2. Calibration (bias, dark, flat processing)
3. Quality assessment (SubframeSelector)
4. Star alignment (StarAlign)
5. Image integration (ImageIntegration with rejection)
6. Post-processing (crop, gradient correction, histogram, noise reduction)
7. Enhancements (stretching, color adjustments)
8. Output

## Code Style

- 4 spaces for indentation (not tabs)
- Follow existing coding conventions in the codebase
- Scripts use PixInsight PJSR framework (JavaScript with PixInsight-specific APIs)

## Related Repositories

- `../website/ruuth.xyz/ai/AutoIntegrateInfo.html` - HTML documentation for the script
- `../TestAutoIntegrate/` - Automated test suite

## Dependencies

- PixInsight application with PJSR support
- ImageSolver script (must be in `../AdP` directory relative to AutoIntegrate)

## Key Configuration Objects

- `global.par` - All processing parameters (100+ settings)
- `global.ppar` - Persistent parameters (saved to PixInsight settings)
- Stretching options defined in `AutoIntegrateGlobal.js`
- Narrowband palettes (SHO, HOS, HSO, etc.) defined in `AutoIntegrateGlobal.js`
