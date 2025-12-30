// ****************************************************************************
// NarrowbandCombinations — Standalone version of AutoIntegrate narrowband combinations
// ****************************************************************************

#feature-id    AutoIntegrate  > Narrowband Combinations
#feature-info  Narrowband Combinations using AutoIntegrate tools.

#include <pjsr/NumericControl.jsh>
#include <pjsr/Sizer.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/StdButton.jsh>
#include <pjsr/StdIcon.jsh>
#include <pjsr/UndoFlag.jsh>
#include <pjsr/SampleType.jsh>
#include <pjsr/ColorSpace.jsh>
#include <pjsr/SectionBar.jsh>
#include <pjsr/StdCursor.jsh>

#define NO_SOLVER_LIBRARY
#define AUTOINTEGRATE_STANDALONE

#include "AutoIntegrateGlobal.js"
#include "AutoIntegrateUtil.js"
#include "AutoIntegrateGUITools.js"
#include "AutoIntegrateEnhancementsGUI.js"
#include "AutoIntegrateEngine.js"
#include "AutoIntegratePreview.js"

// =============================================================================
//  Dummy flowchart routines
// =============================================================================

function AutoIntegrateDummyFlowchart()
{
    this.__base__ = Object;
    this.__base__();
 
    this.flowchartOperation = function () {};
    this.flowchartOperationEnd = function () {};;
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

// =============================================================================
//  DIALOG WITH PREVIEW
// =============================================================================

function NarrowbandCombinationsDialog() {
    this.__base__ = Dialog;
    this.__base__();

    var self = this;

    var debug = true;

    this.TITLE = "Narrowband Combinations";
    this.VERSION = "1.00";

    this.windowTitle = this.TITLE + " v" + this.VERSION;
    this.minWidth = 1000;

    this.rootingArr = [];

    var global = new AutoIntegrateGlobal();
    var util = new AutoIntegrateUtil(global);
    var flowchart = new AutoIntegrateDummyFlowchart();
    var engine = new AutoIntegrateEngine(global, util, flowchart);
    var guitools = new AutoIntegrateGUITools(this, global, util);

    // Read parameter default settings from persistent module settings.
    // These can be saved using the AutoIntegrate script.
    util.readParametersFromPersistentModuleSettings();

    // Store original image for reset functionality
    this.previewImage = null;
    this.autoSTFPreviewImage = null;
    this.autoSTF = true;

    this.selectedMappings = null;

   // -------------------------------------------------------------------------
   // Preview functions
   // -------------------------------------------------------------------------

    function setPreviewImage(image)
    {
        if (debug) console.writeln("NarrowbandCombinationsDialog::setPreviewImage");
        self.previewControl.SetImage(image, "[Preview]");
    }

    // -------------------------------------------------------------------------
    // Image Selections
    // -------------------------------------------------------------------------

    this.getOpenWindows = function() {
        var windows = [];
        var allWindows = ImageWindow.windows;
        for (var i = 0; i < allWindows.length; i++) {
            if (!allWindows[i].isNull && !allWindows[i].mainView.isNull) {
                windows.push(allWindows[i]);
            }
        }
        return windows;
    };

    this.getComboBoxList = function(windows) {
        var list = [];
        if (windows.length === 0) {
            list.push("<No images>");
            return list;
        }
        list.push("<Select image>");
        for (var i = 0; i < windows.length; i++) {
            list.push(windows[i].mainView.id);
        }
        return list;
    };

    this.updateImageList = function(imageComboBox, combobox_list) {
        imageComboBox.clear();
        for (var i = 0; i < combobox_list.length; i++) {
            imageComboBox.addItem(combobox_list[i]);
        }
    };

    this.windows = this.getOpenWindows();
    this.combobox_list = this.getComboBoxList(this.windows);

    this.channelComboBoxes = [];

    this.HSOSizer = new HorizontalSizer;
    this.HSOSizer.spacing = 4;
    var channelNames = ["H-alpha", "S-II", "O-III"];
    for (var i = 0; i < channelNames.length; i++) {
        let channelName = channelNames[i];
        let channelComboBox = new ComboBox(this);
        channelComboBox.toolTip = "Select image for " + channelName + " channel.";
        this.updateImageList(channelComboBox, this.combobox_list);
        this.HSOSizer.add(guitools.newLabel(this, channelName + ": ", channelComboBox.toolTip));
        this.HSOSizer.add(channelComboBox);
        this.channelComboBoxes.push(channelComboBox);
    }

    this.RGBSizer = new HorizontalSizer;
    this.RGBSizer.spacing = 4;
    var channelNames = ["R", "G", "B"];
    for (var i = 0; i < channelNames.length; i++) {
        let channelName = channelNames[i];
        let channelComboBox = new ComboBox(this);
        channelComboBox.toolTip = "Select image for " + channelName + " channel.";
        this.updateImageList(channelComboBox, self.combobox_list);
        this.RGBSizer.add(guitools.newLabel(self, channelName + ": ", channelComboBox.toolTip));
        this.RGBSizer.add(channelComboBox);
        this.channelComboBoxes.push(channelComboBox);
    }

    this.channelsSizer = new VerticalSizer;
    this.channelsSizer.spacing = 8;
    this.channelsSizer.add(this.HSOSizer);
    this.channelsSizer.add(this.RGBSizer);

    // -------------------------------------------------------------------------
    // Processing
    // -------------------------------------------------------------------------

    // Create [ 'channel', 'image id' ] mappings from selected images into an array
    // Skip images with <Select image> or <No images>
    function generateMappingsFromSelection() {
        var selectedMappings = [];
        var channelKeys = ['H', 'S', 'O', 'R', 'G', 'B'];
        for (var i = 0; i < self.channelComboBoxes.length; i++) {
            var comboBox = self.channelComboBoxes[i];
            var selectedText = self.combobox_list[comboBox.currentItem];
            if (selectedText !== "<Select image>" && selectedText !== "<No images>") {
                selectedMappings.push( [ channelKeys[i], selectedText ] );
            }
        }
        console.writeln("Selected mappings: " + JSON.stringify(selectedMappings));
        return selectedMappings;
    }

    this.applyPreview = function() {
        self.selectedMappings = generateMappingsFromSelection();
        if (!self.selectedMappings || self.selectedMappings.length === 0) {
            this.statusLabel.text = "No image loaded for preview.";
            return;
        }

        var narrowband_mappings = {
            target_palette: {
                name: global.par.narrowband_mapping.val,
                R: global.par.custom_R_mapping.val,
                G: global.par.custom_G_mapping.val,
                B: global.par.custom_B_mapping.val
            },
            mappings: self.selectedMappings
        };

        engine.standalone_narrowband_mappings = narrowband_mappings;

        console.show();
        console.writeln("Applying narrowband mapping to preview...");

        this.previewButton.enabled = false;
        this.statusLabel.text = "Processing preview...";
        processEvents();

        try {

            // Pick the first channel images as a model for preview size
            var firstImageId = self.selectedMappings[0][1];
            console.writeln("Using first image for preview size: " + firstImageId);
            var firstImgWin = util.findWindow(firstImageId);

            // Create a temporary color image for processing
            var tempWindow = new ImageWindow(
                                    firstImgWin.mainView.image.width,
                                    firstImgWin.mainView.image.height,
                                    3,
                                    32,
                                    true,
                                    true,
                                    "NarrowbandCombinations_temp"
            );

            // Process the temp view
            engine.enhancementsProcessingEngine(self, tempWindow.mainView.id, true);

            // Copy result back to preview image
            self.previewImage = new Image(tempWindow.mainView.image);

            // make a stretched copy of the image
            engine.autoStretch(tempWindow);
            self.autoSTFPreviewImage = new Image(tempWindow.mainView.image);

            tempWindow.forceClose();

            // Update preview
            if (self.autoSTF) {
                setPreviewImage(self.autoSTFPreviewImage);
            } else {
                setPreviewImage(self.previewImage);
            }

            this.statusLabel.text = "Preview updated successfully.";
            console.writeln("Preview processing complete.");

        } catch (error) {
            this.statusLabel.text = "Error during preview: " + error.message;
            console.criticalln("Preview Error: " + error.message);
        }

        this.previewButton.enabled = true;
    };

    this.processFinal = function() {
        if (!this.previewImage) {
            this.statusLabel.text = "No processed image.";
            return;
        }

        console.show();
        console.writeln("Creating final processed image...");

        this.processButton.enabled = false;
        processEvents();

        try {
            // Create new window with processed result
            var targetWindow = new ImageWindow(
                                    this.previewImage.width,
                                    this.previewImage.height,
                                    this.previewImage.numberOfChannels,
                                    32,
                                    true,
                                    this.previewImage.colorSpace != ColorSpace_Gray,
                                    util.mapBadChars(global.par.narrowband_mapping.val));

            targetWindow.mainView.beginProcess(UndoFlag_NoSwapFile);
            targetWindow.mainView.image.assign(this.previewImage);
            targetWindow.mainView.endProcess();

            targetWindow.show();

            this.statusLabel.text = "Final image created: " + targetWindow.mainView.id;
            console.writeln("Final processing complete.");

        } catch (error) {
            this.statusLabel.text = "Error during final processing: " + error.message;
            console.criticalln("Processing Error: " + error.message);
        }

        this.processButton.enabled = true;
    };

    // -------------------------------------------------------------------------
    // Left Side: Preview Control
    // -------------------------------------------------------------------------

    this.autoSTFCheckBox = new CheckBox(this);
    this.autoSTFCheckBox.text = "AutoSTF";
    this.autoSTFCheckBox.toolTip = "Automatically apply Screen Transfer Function (STF) to preview image.";
    this.autoSTFCheckBox.checked = true;
    this.autoSTFCheckBox.onCheck = function(checked) {
        self.autoSTF = checked;
        // Update preview
        if (self.autoSTF) {
            setPreviewImage(self.autoSTFPreviewImage);
        } else {
            setPreviewImage(self.previewImage);
        }
    };

    // Preview buttons
    this.previewButton = new PushButton(this);
    this.previewButton.text = "Update Preview";
    this.previewButton.icon = this.scaledResource(":/icons/play.png");
    this.previewButton.toolTip = "Apply narrowband combination to preview image.";
    this.previewButton.onClick = function() {
        self.applyPreview();
    };

    this.previewButtonsSizer = new HorizontalSizer;
    this.previewButtonsSizer.spacing = 4;
    this.previewButtonsSizer.addStretch();
    this.previewButtonsSizer.add(this.autoSTFCheckBox);
    this.previewButtonsSizer.add(this.previewButton, 50);

    // Preview control
    this.previewControl = new AutoIntegratePreviewControl(this, "narrowband_preview", engine, util, global, 800, 600, false);

    this.leftSizer = new VerticalSizer;
    this.leftSizer.spacing = 4;
    this.leftSizer.add(this.previewControl, 400);
    this.leftSizer.add(this.previewButtonsSizer);

    // -------------------------------------------------------------------------
    // Right Side: Title and Controls
    // -------------------------------------------------------------------------

    this.titleLabel = new Label(this);
    this.titleLabel.text = this.TITLE + " v" + this.VERSION;
    this.titleLabel.textAlignment = TextAlign_Center;
    this.titleLabel.styleSheet = "font-size: 14pt; font-weight: bold; color: #4488FF;";

    this.subtitleLabel = new Label(this);
    this.subtitleLabel.text = "Select channel images and apply narrowband palette combination.";
    this.subtitleLabel.textAlignment = TextAlign_Center;
    this.subtitleLabel.styleSheet = "font-size: 9pt; color: #888888; font-style: italic;";

   // -------------------------------------------------------------------------
   // Narrowband palette selection
   // -------------------------------------------------------------------------

    if (global.debug) console.writeln("NarrowbandCombinationsDialog:: creating narrowbandCustomPaletteGroupBox");

    this.narrowbandCustomPaletteSizer = guitools.createNarrowbandCustomPaletteSizer(this);

    this.narrowbandCustomPaletteGroupBox = new GroupBox(this);
    this.narrowbandCustomPaletteGroupBox.title = "Narrowband Palette";
    this.narrowbandCustomPaletteGroupBox.sizer = this.narrowbandCustomPaletteSizer;

   // -------------------------------------------------------------------------
   // Status
   // -------------------------------------------------------------------------

   this.statusLabel = new Label(this);
   this.statusLabel.text = "";
   this.statusLabel.textAlignment = TextAlign_Center;
   this.statusLabel.styleSheet = "color: #AAAAAA;";

   // -------------------------------------------------------------------------
   // Buttons
   // -------------------------------------------------------------------------

    this.processButton = new PushButton(this);
    this.processButton.text = "Process Final";
    this.processButton.icon = this.scaledResource(":/icons/power.png");
    this.processButton.toolTip = "Create final processed image (does not overwrite original).";
    this.processButton.onClick = function() {
        self.processFinal();
    };

    this.closeButton = new PushButton(this);
    this.closeButton.text = "Close";
    this.closeButton.icon = this.scaledResource(":/icons/close.png");
    this.closeButton.onClick = function() {
        self.ok();
    };

    this.buttonsSizer = new HorizontalSizer;
    this.buttonsSizer.spacing = 6;
    this.buttonsSizer.addStretch();
    this.buttonsSizer.add(this.processButton);
    this.buttonsSizer.add(this.closeButton);

   // -------------------------------------------------------------------------
   // Right Side Layout
   // -------------------------------------------------------------------------

   this.rightSizer = new VerticalSizer;
   this.rightSizer.spacing = 8;
   this.rightSizer.add(this.titleLabel);
   this.rightSizer.add(this.subtitleLabel);
   this.rightSizer.add(this.statusLabel);
   this.rightSizer.add(this.channelsSizer);
   this.rightSizer.add(this.narrowbandCustomPaletteGroupBox);
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

NarrowbandCombinationsDialog.prototype = new Dialog;

// =============================================================================
//  MAIN ENTRY POINT
// =============================================================================

function main() {
   console.show();

   var dialog = new NarrowbandCombinationsDialog();
   dialog.execute();
}

main();
