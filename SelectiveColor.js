// ****************************************************************************
// SelectiveColor — Standalone Selective Color adjustment tool
// ****************************************************************************

#engine v8
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
#include "AutoIntegrateEnhancementsGUI.js"
#include "AutoIntegrateSelectiveColor.js"
#include "AutoIntegrateEngine.js"
#include "AutoIntegratePreview.js"

// =============================================================================
//  Dummy flowchart and engine routines
// =============================================================================

#ifndef AUTOINTEGRATEDUMMYFLOWCHART
#define AUTOINTEGRATEDUMMYFLOWCHART

class AutoIntegrateDummyFlowchart extends Object
{
    constructor() {
        super();
    }

    flowchartOperation() {};
    flowchartOperationEnd() {};
    flowchartParentBegin() {};
    flowchartParentEnd() {};
    flowchartChildBegin() {};
    flowchartChildEnd() {};
    flowchartMaskBegin() {};
    flowchartMaskEnd() {};
    flowchartInit() {};
    flowchartDone() {};
    flowchartReset() {};
    flowchartPrint() {};
}

#endif /* AUTOINTEGRATEDUMMYFLOWCHART */

// =============================================================================
//  DIALOG WITH PREVIEW
// =============================================================================

class AutoIntegrateSelectiveColorDialog extends Dialog {
    constructor() {
        super();

    this.TITLE = "Selective Color";
    this.VERSION = "1.00";

    this.windowTitle = this.TITLE + " v" + this.VERSION;

    this.global = new AutoIntegrateGlobal();

    for (let i = 0; i < Runtime.jsArguments.length; i++) {
        if (Runtime.jsArguments[i] == "do_not_read_settings") {
            console.writeln("do_not_read_settings");
            this.global.do_not_read_settings = true;
        }
    }

    this.util = new AutoIntegrateUtil(this.global);
    this.flowchart = new AutoIntegrateDummyFlowchart();
    this.engine = new AutoIntegrateEngine(this.global, this.util, this.flowchart);
    this.guitools = new AutoIntegrateGUITools(this, this.global, this.util, this.engine);

    // Read parameter default settings from persistent module settings.
    this.util.initStandalone();

    this.global.par.enhancements_selective_color.val = true;

    this.initGUI();

} // End of constructor

   // -------------------------------------------------------------------------
   // Preview functions
   // -------------------------------------------------------------------------

    setPreviewIdReset(id, keep_zoom, histogramInfo)
    {
        if (this.global.debug) console.writeln("AutoIntegrateSelectiveColorDialog::setPreviewIdReset: id = " + id);
        var win = ImageWindow.windowById(id);
        this.previewControl.SetImage(win.mainView.image, win.mainView.id + " [Preview]");
    }

    updatePreviewIdReset(id, keep_zoom, histogramInfo)
    {
        if (this.global.debug) console.writeln("AutoIntegrateSelectiveColorDialog::updatePreviewIdReset: id = " + id);
        this.updatePreviewWin(ImageWindow.windowById(id));
    }

    updatePreviewNoImage()
    {
        if (this.global.debug) console.writeln("AutoIntegrateSelectiveColorDialog::updatePreviewNoImage");
        this.statusLabel.text = "No image available for preview.";
    }

    updatePreviewTxt(txt)
    {
        if (this.global.debug) console.writeln("AutoIntegrateSelectiveColorDialog::updatePreviewTxt: " + txt);
    }

    updatePreviewWin(imgWin)
    {
        if (this.global.debug) console.writeln("AutoIntegrateSelectiveColorDialog::updatePreviewWin: imgWin = " + imgWin);
        this.previewControl.UpdateImage(imgWin.mainView.image);
    }

    updatePreviewWinTxt(imgWin, txt)
    {
        if (this.global.debug) console.writeln("AutoIntegrateSelectiveColorDialog::updatePreviewWinTxt: imgWin = " + imgWin);
        this.updatePreviewWin(imgWin);
    }

    initGUI() {

   // -------------------------------------------------------------------------
   // Status
   // -------------------------------------------------------------------------

   this.statusLabel = new Label(this);
   this.statusLabel.text = "";
   this.statusLabel.textAlignment = TextAlignment.Center;
   this.statusLabel.styleSheet = "color: #AAAAAA;";

   // -------------------------------------------------------------------------
   // Preview functions
   // -------------------------------------------------------------------------

    var preview_functions = {
        setPreviewIdReset: (id, keep_zoom, histogramInfo) => this.setPreviewIdReset(id, keep_zoom, histogramInfo),
        updatePreviewIdReset: (id, keep_zoom, histogramInfo) => this.updatePreviewIdReset(id, keep_zoom, histogramInfo),
        updatePreviewTxt: (txt) => this.updatePreviewTxt(txt),
        updatePreviewNoImage: () => this.updatePreviewNoImage(),
        createCombinedMosaicPreviewWin: null,
        updatePreviewWin: (imgWin) => this.updatePreviewWin(imgWin),
        updatePreviewWinTxt: (imgWin, txt) => this.updatePreviewWinTxt(imgWin, txt),
   };

   // -------------------------------------------------------------------------
   // Left Side: Preview Control
   // -------------------------------------------------------------------------

   this.previewControl = new AutoIntegratePreviewControl(this, "selective_color_preview", this.engine, this.util, this.global, 600, 600, false);

   this.leftSizer = new VerticalSizer;
   this.leftSizer.spacing = 4;
   this.leftSizer.add(this.previewControl, 600);

   // -------------------------------------------------------------------------
   // Right Side: Title and Controls
   // -------------------------------------------------------------------------

   this.titleLabel = new Label(this);
   this.titleLabel.text = this.TITLE + " v" + this.VERSION;
   this.titleLabel.textAlignment = TextAlignment.Center;
   this.titleLabel.styleSheet = "font-size: 14pt; font-weight: bold; color: #4488FF;";

   this.subtitleLabel = new Label(this);
   this.subtitleLabel.text = "Selective color adjustments";
   this.subtitleLabel.textAlignment = TextAlignment.Center;
   this.subtitleLabel.styleSheet = "font-size: 9pt; color: #888888; font-style: italic;";

   // -------------------------------------------------------------------------
   // Target Image Selection
   // -------------------------------------------------------------------------

    this.enhancements_gui = new AutoIntegrateEnhancementsGUI(this, this.guitools, this.util, this.global, this.engine, preview_functions);

    this.targetImageSizer = this.enhancements_gui.createTargetImageSizer(this);
    this.enhancements_gui.apply_completed_callback = (apply_ok) => {
        // We do stretching here so we set the value to true
        // With reset option it may have been reset to false (default)
        this.global.par.enhancements_selective_color.val = true;
    };
    this.targetImageGroupBox = new GroupBox(this);
    this.targetImageGroupBox.title = "Target image";
    this.targetImageGroupBox.sizer = this.targetImageSizer;

   // -------------------------------------------------------------------------
   // Selective Color Controls
   // -------------------------------------------------------------------------

    this.selectiveColor = new AutoIntegrateSelectiveColor(this.guitools, this.util, this.global, preview_functions);
    this.selectiveColorSizer = this.selectiveColor.createSelectiveColorSizer(this);

   // -------------------------------------------------------------------------
   // Close Button
   // -------------------------------------------------------------------------

    this.closeButton = new PushButton(this);
    this.closeButton.text = "Close";
    this.closeButton.icon = this.scaledResource(":/icons/close.png");
    this.closeButton.onClick = () => {
        this.ok();
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

} // initGUI

} // AutoIntegrateSelectiveColorDialog

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
