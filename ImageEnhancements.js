// ****************************************************************************
// ImageEnhancements — Standalone version of AutoIntegrate image enhancements
// ****************************************************************************

#engine v8
#feature-id    AutoIntegrate  > Image Enhancements
#feature-info  Image Enhancements using AutoIntegrate tools.

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
#include "AutoIntegrateEngine.js"
#include "AutoIntegratePreview.js"

// =============================================================================
//  Dummy flowchart routines
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

class AutoIntegrateImageEnhancementsDialog extends Dialog {
    constructor() {
        super();


    this.TITLE = "Image Enhancements";
    this.VERSION = "1.00";

    this.windowTitle = this.TITLE + " v" + this.VERSION;
    // this.minWidth = 1000;

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
    // These can be saved using the AutoIntegrate script.
    this.util.initStandalone();

   // -------------------------------------------------------------------------
   // Status
   // -------------------------------------------------------------------------

   this.statusLabel = new Label(this);
   this.statusLabel.text = "";
   this.statusLabel.textAlignment = TextAlignment.Center;
   this.statusLabel.styleSheet = "color: #AAAAAA;";

   this.initGUI();

} // AutoIntegrateImageEnhancementsDialog constructor

   // -------------------------------------------------------------------------
   // Preview functions
   // -------------------------------------------------------------------------

    setPreviewIdReset(id, keep_zoom, histogramInfo)
    {
        if (this.global.debug) console.writeln("AutoIntegrateImageEnhancementsDialog::updatePreviewIdReset: id = " + id);
        var win = ImageWindow.windowById(id);
        this.previewControl.SetImage(win.mainView.image, win.mainView.id + " [Preview]");
    }

    updatePreviewIdReset(id, keep_zoom, histogramInfo)
    {
        if (this.global.debug) console.writeln("AutoIntegrateImageEnhancementsDialog::updatePreviewIdReset: id = " + id);
        this.updatePreviewWin(ImageWindow.windowById(id));
    }

    updatePreviewNoImage()
    {
        if (this.global.debug) console.writeln("AutoIntegrateImageEnhancementsDialog::updatePreviewNoImage");
        this.statusLabel.text = "No image available for preview.";
    }

    updatePreviewTxt(txt)
    {
        if (this.global.debug) console.writeln("AutoIntegrateImageEnhancementsDialog::updatePreviewTxt: " + txt);
    }

    updatePreviewWin(imgWin)
    {
        if (this.global.debug) console.writeln("AutoIntegrateImageEnhancementsDialog::updatePreviewWin: imgWin = " + imgWin);
        this.previewControl.UpdateImage(imgWin.mainView.image);
    }

    updatePreviewWinTxt(imgWin, txt)
    {
        if (this.global.debug) console.writeln("AutoIntegrateImageEnhancementsDialog::updatePreviewWinTxt: imgWin = " + imgWin);
        this.updatePreviewWin(imgWin);
    }

    initGUI() {

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

   this.previewControl = new AutoIntegratePreviewControl(this, "enhancements_preview", this.engine, this.util, this.global, 600, 600, false);

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
   this.subtitleLabel.text = "Select image and apply enhancements";
   this.subtitleLabel.textAlignment = TextAlignment.Center;
   this.subtitleLabel.styleSheet = "font-size: 9pt; color: #888888; font-style: italic;";

   this.enhancements_gui = new AutoIntegrateEnhancementsGUI(this, this.guitools, this.util, this.global, this.engine, preview_functions);
   this.enhancements_gui.setPreviewControl(this.previewControl);

    this.enhancementsGUIControls = this.enhancements_gui.createEnhancementsGUIControls(this);

    this.GraXpertPathSizerSectionLabel = this.guitools.newSectionLabel(this, "GraXpert path");
    this.GraXpertPathSizer = this.guitools.createGraXpertPathSizer(this);

    this.toolsControl = this.guitools.createImageToolsControl(this);
    this.toolsControl.sizer.add( this.GraXpertPathSizerSectionLabel );
    this.toolsControl.sizer.add( this.GraXpertPathSizer );
    this.toolsControl.visible = false;

   // -------------------------------------------------------------------------
   // Load and save JSON controls
   // -------------------------------------------------------------------------

   var obj = this.guitools.newJsonSizerObj(this, null, "ImageEnhancementsSettings.json");
   this.loadSaveSizer = obj.sizer;

   // -------------------------------------------------------------------------
   // Enhancements Group Box
   // -------------------------------------------------------------------------

    if (this.global.debug) console.writeln("AutoIntegrateImageEnhancementsDialog:: creating enhancementsGroupBox");

    this.enhancementsGroupBox = this.guitools.newGroupBoxSizer(this);
    this.guitools.newSectionBarAdd(this, this.enhancementsGroupBox, this.enhancementsGUIControls.targetImageControl, "Target image for enhancements", "EnhancementsTarget");
    this.guitools.newSectionBarAdd(this, this.enhancementsGroupBox, this.enhancementsGUIControls.optionsControl, "Misc options", "EnhancementsOptions");
    this.guitools.newSectionBarAdd(this, this.enhancementsGroupBox, this.enhancementsGUIControls.narrowbandControl, "Narrowband enhancements", "Enhancements2");
    this.guitools.newSectionBarAdd(this, this.enhancementsGroupBox, this.enhancementsGUIControls.selectiveColorControl, "Selective Color", "Enhancements3");
    this.guitools.newSectionBarAdd(this, this.enhancementsGroupBox, this.enhancementsGUIControls.genericControl, "Generic enhancements", "Enhancements1");
    this.guitools.newSectionBarAdd(this, this.enhancementsGroupBox, this.enhancementsGUIControls.starsControl, "Stars enhancements", "EnhancementsStars");
    this.guitools.newSectionBarAdd(this, this.enhancementsGroupBox, this.toolsControl, "Tools", "EnhancementsTools");
    this.enhancementsGroupBox.sizer.addStretch();

   // -------------------------------------------------------------------------
   // Buttons
   // -------------------------------------------------------------------------

    this.resetButton = new PushButton(this);
    this.resetButton.text = "Reset";
    this.resetButton.toolTip = "Reset all parameters to defaults.";
    this.resetButton.onClick = () => {
            this.util.setParameterDefaults();
    };

    this.closeButton = new PushButton(this);
    this.closeButton.text = "Close";
    this.closeButton.icon = this.scaledResource(":/icons/close.png");
    this.closeButton.onClick = () => {
        console.writeln("Closing dialog");
        this.ok();
    };

    this.buttonsSizer = new HorizontalSizer;
    this.buttonsSizer.spacing = 6;
    this.buttonsSizer.add(this.resetButton);
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
   this.rightSizer.add(this.loadSaveSizer);
   this.rightSizer.add(this.enhancementsGroupBox);
   this.rightSizer.add(this.buttonsSizer);

   // -------------------------------------------------------------------------
   // Main Layout (Preview on Left, Controls on Right)
   // -------------------------------------------------------------------------

   this.sizer = new HorizontalSizer;
   this.sizer.margin = 8;
   this.sizer.spacing = 8;
   this.sizer.add(this.leftSizer);
   this.sizer.add(this.rightSizer);

} // AutoIntegrateImageEnhancementsDialog initGUI

}
// =============================================================================
//  MAIN ENTRY POINT
// =============================================================================

#ifndef AUTOINTEGRATE_NO_MAIN

function main() {
   console.show();

   var dialog = new AutoIntegrateImageEnhancementsDialog();
   dialog.execute();
}

main();

#endif  // AUTOINTEGRATE_NO_MAIN
