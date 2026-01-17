// ****************************************************************************
// SelectiveColor — Standalone Selective Color adjustment tool
// ****************************************************************************

#feature-id    AutoIntegrate  > Selective Color
#feature-info  Selective Color adjustments using AutoIntegrate tools.

#ifndef NO_SOLVER_LIBRARY
#define NO_SOLVER_LIBRARY
#endif
#ifndef AUTOINTEGRATE_STANDALONE
#define AUTOINTEGRATE_STANDALONE
#endif

#include "AutoIntegrateGlobal.js"
#include "AutoIntegrateUtil.js"
#include "AutoIntegrateGUITools.js"
#include "AutoIntegrateSelectiveColor.js"
#include "AutoIntegrateEngine.js"
#include "AutoIntegratePreview.js"

// =============================================================================
//  Dummy flowchart and engine routines
// =============================================================================

#ifndef AUTOINTEGRATEDUMMYFLOWCHART
#define AUTOINTEGRATEDUMMYFLOWCHART

function AutoIntegrateDummyFlowchart()
{
    this.__base__ = Object;
    this.__base__();

    this.flowchartOperation = function () {};
    this.flowchartOperationEnd = function () {};
    this.flowchartParentBegin = function () {};
    this.flowchartParentEnd = function () {};
    this.flowchartChildBegin = function () {};
    this.flowchartChildEnd = function () {};
    this.flowchartMaskBegin = function () {};
    this.flowchartMaskEnd = function () {};
    this.flowchartInit = function () {};
    this.flowchartDone = function () {};
    this.flowchartReset = function () {};
    this.flowchartPrint = function () {};
}

AutoIntegrateDummyFlowchart.prototype = new Object;

#endif /* AUTOINTEGRATEDUMMYFLOWCHART */

// =============================================================================
//  DIALOG WITH PREVIEW
// =============================================================================

function AutoIntegrateSelectiveColorDialog() {
    this.__base__ = Dialog;
    this.__base__();

    var self = this;

    var debug = false;

    this.TITLE = "Selective Color";
    this.VERSION = "1.00";

    this.windowTitle = this.TITLE + " v" + this.VERSION;
    // this.minWidth = 800;

    var global = new AutoIntegrateGlobal();
    this.global = global;

    global.debug = debug;
    for (let i = 0; i < jsArguments.length; i++) {
        if (jsArguments[i] == "do_not_read_settings") {
            console.writeln("do_not_read_settings");
            global.do_not_read_settings = true;
        }
    }

    var util = new AutoIntegrateUtil(global);
    this.util = util;

    var flowchart = new AutoIntegrateDummyFlowchart();
    this.flowchart = flowchart;
    var engine = new AutoIntegrateEngine(global, util, flowchart);
    this.engine = engine;
    var guitools = new AutoIntegrateGUITools(this, global, util, engine);
    this.guitools = guitools;

    // Read parameter default settings from persistent module settings.
    util.initStandalone();

    global.par.enhancements_selective_color.val = true;

   // -------------------------------------------------------------------------
   // Status
   // -------------------------------------------------------------------------

   this.statusLabel = new Label(this);
   this.statusLabel.text = "";
   this.statusLabel.textAlignment = TextAlign_Center;
   this.statusLabel.styleSheet = "color: #AAAAAA;";

   // -------------------------------------------------------------------------
   // Preview functions
   // -------------------------------------------------------------------------

    function setPreviewIdReset(id, keep_zoom, histogramInfo)
    {
        if (debug) console.writeln("AutoIntegrateSelectiveColorDialog::setPreviewIdReset: id = " + id);
        var win = ImageWindow.windowById(id);
        self.previewControl.SetImage(win.mainView.image, win.mainView.id + " [Preview]");
    }

    function updatePreviewIdReset(id, keep_zoom, histogramInfo)
    {
        if (debug) console.writeln("AutoIntegrateSelectiveColorDialog::updatePreviewIdReset: id = " + id);
        updatePreviewWin(ImageWindow.windowById(id));
    }

    function updatePreviewNoImage()
    {
        if (debug) console.writeln("AutoIntegrateSelectiveColorDialog::updatePreviewNoImage");
        self.statusLabel.text = "No image available for preview.";
    }

    function updatePreviewTxt(txt)
    {
        if (debug) console.writeln("AutoIntegrateSelectiveColorDialog::updatePreviewTxt: " + txt);
    }

    function updatePreviewWin(imgWin)
    {
        if (debug) console.writeln("AutoIntegrateSelectiveColorDialog::updatePreviewWin: imgWin = " + imgWin);
        self.previewControl.UpdateImage(imgWin.mainView.image);
    }

    function updatePreviewWinTxt(imgWin, txt)
    {
        if (debug) console.writeln("AutoIntegrateSelectiveColorDialog::updatePreviewWinTxt: imgWin = " + imgWin);
        updatePreviewWin(imgWin);
    }

    var preview_functions = {
        setPreviewIdReset: setPreviewIdReset,
        updatePreviewIdReset: updatePreviewIdReset,
        updatePreviewTxt: updatePreviewTxt,
        updatePreviewNoImage: updatePreviewNoImage,
        createCombinedMosaicPreviewWin: null,
        updatePreviewWin: updatePreviewWin,
        updatePreviewWinTxt: updatePreviewWinTxt,
   };

   // -------------------------------------------------------------------------
   // Left Side: Preview Control
   // -------------------------------------------------------------------------

   this.previewControl = new AutoIntegratePreviewControl(this, "selective_color_preview", engine, util, global, 600, 600, false);

   this.leftSizer = new VerticalSizer;
   this.leftSizer.spacing = 4;
   this.leftSizer.add(this.previewControl, 600);

   // -------------------------------------------------------------------------
   // Right Side: Title and Controls
   // -------------------------------------------------------------------------

   this.titleLabel = new Label(this);
   this.titleLabel.text = this.TITLE + " v" + this.VERSION;
   this.titleLabel.textAlignment = TextAlign_Center;
   this.titleLabel.styleSheet = "font-size: 14pt; font-weight: bold; color: #4488FF;";

   this.subtitleLabel = new Label(this);
   this.subtitleLabel.text = "Selective color adjustments";
   this.subtitleLabel.textAlignment = TextAlign_Center;
   this.subtitleLabel.styleSheet = "font-size: 9pt; color: #888888; font-style: italic;";

   // -------------------------------------------------------------------------
   // Target Image Selection
   // -------------------------------------------------------------------------

    this.enhancements_gui = new AutoIntegrateEnhancementsGUI(this, self.guitools, self.util, self.global, self.engine, preview_functions);

    this.targetImageSizer = this.enhancements_gui.createTargetImageSizer(this);
    this.enhancements_gui.apply_completed_callback = function(apply_ok) {
        // We do stretching here so we set the value to true
        // With reset option it may have been reset to false (default)
        global.par.enhancements_selective_color.val = true;
    };
    this.targetImageGroupBox = new GroupBox(this);
    this.targetImageGroupBox.title = "Target image";
    this.targetImageGroupBox.sizer = this.targetImageSizer;

   // -------------------------------------------------------------------------
   // Selective Color Controls
   // -------------------------------------------------------------------------

    var selectiveColor = new AutoIntegrateSelectiveColor(guitools, util, global, preview_functions);
    this.selectiveColor = selectiveColor;
    var selectiveColorEngine = selectiveColor.createSelectiveColorEngine();
    this.selectiveColorEngine = selectiveColorEngine;
    self.engine.selectiveColorEngine = self.selectiveColorEngine;

    this.selectiveColorSizer = selectiveColor.createSelectiveColorSizer(this, selectiveColorEngine);

   // -------------------------------------------------------------------------
   // Close Button
   // -------------------------------------------------------------------------

    this.closeButton = new PushButton(this);
    this.closeButton.text = "Close";
    this.closeButton.icon = this.scaledResource(":/icons/close.png");
    this.closeButton.onClick = function() {
        self.ok();
    };

    this.buttonsSizer = new HorizontalSizer;
    this.buttonsSizer.spacing = 6;
    this.buttonsSizer.addStretch();
    this.buttonsSizer.add(this.closeButton);

   // -------------------------------------------------------------------------
   // Right Side Layout
   // -------------------------------------------------------------------------

   this.rightSizer = new VerticalSizer;
   this.rightSizer.spacing = 8;
   this.rightSizer.add(this.titleLabel);
   this.rightSizer.add(this.subtitleLabel);
   this.rightSizer.add(this.statusLabel);
   this.rightSizer.addSpacing(8);
   this.rightSizer.add(this.targetImageGroupBox);
   this.rightSizer.addSpacing(8);
   this.rightSizer.add(this.selectiveColorSizer);
   this.rightSizer.addStretch();
   this.rightSizer.add(this.buttonsSizer);

   // -------------------------------------------------------------------------
   // Main Layout (Preview on Left, Controls on Right)
   // -------------------------------------------------------------------------

   this.sizer = new HorizontalSizer;
   this.sizer.margin = 8;
   this.sizer.spacing = 8;
   this.sizer.add(this.leftSizer);
   this.sizer.add(this.rightSizer);
}

AutoIntegrateSelectiveColorDialog.prototype = new Dialog;

// =============================================================================
//  MAIN ENTRY POINT
// =============================================================================

#ifndef AUTOINTEGRATE_NO_MAIN

function main() {
   console.show();

   var dialog = new AutoIntegrateSelectiveColorDialog();
   dialog.execute();
}

main();

#endif  // AUTOINTEGRATE_NO_MAIN
