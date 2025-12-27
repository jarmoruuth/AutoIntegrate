//
// GUI utility functions for AutoIntegrate script
//

function AutoIntegrateGUITools( parent, global, util )
{

if (global.debug) console.writeln("AutoIntegrateGUITools");

this.__base__ = Object;
this.__base__();

var par = global.par;

this.starless_and_stars_combine_values = [ 'Add', 'Screen', 'Lighten' ];

this.Foraxx_credit = "Foraxx and Dynamic palettes, credit https://thecoldestnights.com/2020/06/PixInsight-dynamic-narrowband-combinations-with-pixelmath/";
this.unscreen_tooltip = "<p>Use unscreen method to get stars image as described by Russell Croman.</p>" +
                        "<p>Unscreen method usually keeps star colors more correct than simple star removal. It is " + 
                        "recommended to use Screen method when combining star and starless images back together.<p>";
this.stars_combine_operations_Tooltip =    "<p>Possible combine operations are:</p>" +
                                          "<ul>" + 
                                          "<li>Add - Use stars+starless formula in Pixelmath</li>" +
                                          "<li>Screen - Similar to screen in Photoshop</li>" +
                                          "<li>Lighten - Similar to lighten in Photoshop</li>" +
                                          "</ul>";
this. noiseReductionToolTipCommon = "<p>AI based noise reduction using NoiseXTerminator, GraXpert denoise or DeepSNR do not use a mask.</p> " +
                                    "<p>Default noise reduction using MultiscaleLinerTransform is done using a luminance mask to target noise " + 
                                    "reduction on darker areas of the image.</p>";
this. ACDNR_StdDev_tooltip =  "<p>A mild ACDNR noise reduction with StdDev value between 1.0 and 2.0 can be useful to smooth image and reduce black spots " + 
                              "left from previous noise reduction.</p>";
this.adjust_type_toolTip = "<ul>" +
                              "<li>Lights adjust only light parts of the image.</li>" +
                              "<li>Darks adjust only dark parts of the image.</li>" +
                              "<li>All adjust the whole image.</li>" +
                              "</ul>";
this.clippedPixelsToolTip = "<p>Show clipped pixels in the preview image.</p>" + 
                              "<p>Pixels with value 0 are shown as black, pixels with value 1 are shown as white. Other pixels are shown as gray.</p>";

this.MGCToolTip =  "<p>When MultiscaleGradientCorrection is selected, image solving and SpectrophotometricFluxCalibration are run automatically for the image.</p>" +
                   "<p>MultiscaleGradientCorrection may fail if the image is not part of the sky area in the MARS database. In that case the script reverts to another " + 
                   "gradient correction method. If other gradient correction methods are checked then they are selected in the following order: GraXpert, ABE, DBE, GradientCorrection<./p>";
this.BXT_no_PSF_tip = "Sometimes on starless images PSF value can not be calculated. Then a manual value should be given or BlurXTerminator should not be used.";
this.skip_reset_tooltip = "<p>Note that this parameter is not reset or saved to Json file.</p>";   

function newVerticalSizer(margin, add_stretch, items)
{
      var sizer = new VerticalSizer;
      sizer.textAlignment = TextAlign_Left | TextAlign_VertCenter;
      if (margin > 0) {
            sizer.margin = margin;
      }
      sizer.spacing = 4;
      for (var i = 0; i < items.length; i++) {
            sizer.add(items[i]);
      }
      if (add_stretch) {
            sizer.addStretch();
      }
      return sizer;
}

function newHorizontalSizer(margin, add_stretch, items, spacing)
{
      var sizer = new HorizontalSizer;
      sizer.textAlignment = TextAlign_Left | TextAlign_VertCenter;
      sizer.margin = margin;
      if (spacing != null) {
            sizer.spacing = spacing;
      } else {
            sizer.spacing = 4;
      }
      for (var i = 0; i < items.length; i++) {
            sizer.add(items[i]);
      }
      if (add_stretch) {
            sizer.addStretch();
      }
      return sizer;
}

 function newCheckBoxEx( parent, checkboxText, param, toolTip, onClick, updatedCallback = null)
 {
       var cb = new CheckBox( parent );
       cb.text = checkboxText;
       cb.aiParam = param;
       try {
            cb.checked = cb.aiParam.val;
      } catch(err) {    
            console.criticalln("newCheckBoxEx: " + err);
            console.criticalln("Text: " + param.name);
            console.criticalln("Parameter name: " + checkboxText);
            console.criticalln("Parameter type: " + param.type);
            console.criticalln("Parameter value: " + param.val);
            console.criticalln("CheckBox value not set");
      }
       if (onClick != null) {
             cb.onClick = onClick;
       } else {
             cb.onClick = function(checked) { 
                  cb.aiParam.val = checked;
                  if (updatedCallback != null) {
                        updatedCallback();
                  }
             }
       }
       if ( typeof toolTip !== 'undefined' && toolTip != null ) {
             cb.toolTip = util.formatToolTip(toolTip);
       }
 
       cb.aiParam.reset = function() {
             cb.checked = cb.aiParam.val;
       };
 
       return cb;
 }
 
 function newCheckBox( parent, checkboxText, param, toolTip, updatedCallback = null)
 {
       return newCheckBoxEx(parent, checkboxText, param, toolTip, null, updatedCallback);
 }
 function newGenericCheckBox( parent, checkboxText, param, val, toolTip, onClick )
 {
       var cb = new CheckBox( parent );
       cb.aiParam = param;
       cb.text = checkboxText;
       cb.checked = val;
       cb.onClick = onClick;
       cb.toolTip = util.formatToolTip(toolTip);
 
       return cb;
 }
 
function newGroupBox( parent, title, toolTip )
{
      var gb = new GroupBox( parent );
      if ( typeof title !== 'undefined' && title != null ) { 
            gb.title = title; 
      }
      if ( typeof toolTip !== 'undefined' && toolTip != null ) { 
            gb.toolTip = util.formatToolTip(toolTip);
      }

      return gb;
}

function newSectionLabel(parent, text)
{
      var lbl = new Label( parent );
      lbl.useRichText = true;
      lbl.text = '<p style="color:SlateBlue"><b>' + text + "</b></p>";

      return lbl;
}

function newLabel(parent, text, tip, align_left)
{
      var lbl = new Label( parent );
      lbl.text = text;
      if (align_left) {
            lbl.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      } else {
            lbl.textAlignment = TextAlign_Right|TextAlign_VertCenter;
      }
      if (tip != null) {
            lbl.toolTip = util.formatToolTip(tip);
      }

      return lbl;
}

function newTextEdit(parent, param, tooltip)
{
      var edt = new Edit( parent );
      edt.aiParam = param;
      edt.onTextUpdated = function(value) { 
            edt.aiParam.val = value; 
      };
      edt.text = edt.aiParam.val;
      edt.toolTip = util.formatToolTip(tooltip);
      edt.aiParam.reset = function() {
            edt.text = edt.aiParam.val;
      };
      return edt;
}

function newGenericTextEdit(parent, param, val, tooltip, onTextUpdated)
{
      var edt = new Edit( parent );
      edt.aiParam = param;
      edt.onTextUpdated = onTextUpdated;
      edt.text = val;
      edt.toolTip = util.formatToolTip(tooltip);
      return edt;
}

function newNumericEditPrecision(parent, txt, param, min, max, tooltip, precision, updatedCallback = null)
{
      var edt = new NumericEdit( parent );
      edt.label.text = txt;
      edt.label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      edt.real = true;
      edt.edit.setFixedWidth( 6 * parent.font.width( "0" ) );
      edt.aiParam = param;
      edt.onValueUpdated = function(value) { 
            edt.aiParam.val = value; 
      };
      edt.setPrecision( precision );
      edt.setRange(min, max);
      edt.setValue(edt.aiParam.val);
      edt.toolTip = util.formatToolTip(tooltip);
      edt.aiParam.reset = function() {
            edt.setValue(edt.aiParam.val);
            if (updatedCallback != null) {
                  updatedCallback();
            }
      };
      edt.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      return edt;
}

function newNumericEdit(parent, txt, param, min, max, tooltip)
{
      return newNumericEditPrecision(parent, txt, param, min, max, tooltip, 2)
}

function newRGBNBNumericEdit(parent, txt, param, tooltip)
{
      return newNumericEdit(parent, txt, param, 0.1, 999, tooltip);
}

function newNumericControlEx(parent, txt, param, prec, min, max, tooltip, updatedCallback)
{
      var edt = new NumericControl( parent );
      edt.label.text = txt;
      edt.setRange(min, max);
      if (prec == 3) {
            edt.setPrecision(3);
            edt.slider.setRange(0.0, 1000.0);
      } else {
            edt.setPrecision(2);
            edt.slider.setRange(0.0, 100.0);
      }
      edt.aiParam = param;
      edt.setValue(edt.aiParam.val);
      edt.onValueUpdated = function(value) { 
            edt.aiParam.val = value;
            // console.writeln("NumericControl " + txt + " " + value);
            if (updatedCallback != null) {
                  // console.writeln("NumericControl " + txt + " callback");
                  updatedCallback();
            }
      };
      edt.toolTip = util.formatToolTip(tooltip);
      edt.aiParam.reset = function() {
            edt.setValue(edt.aiParam.val);
            if (updatedCallback != null) {
                  updatedCallback();
            }
      };
      return edt;
}

function newNumericControl2(parent, txt, param, min, max, tooltip, updatedCallback)
{
      return newNumericControlEx(parent, txt, param, 2, min, max, tooltip, updatedCallback)
}

function newNumericControl3(parent, txt, param, min, max, tooltip, updatedCallback)
{
      return newNumericControlEx(parent, txt, param, 3, min, max, tooltip, updatedCallback)
}

function newSpinBox(parent, param, min, max, tooltip)
{
      var edt = new SpinBox( parent );
      edt.minValue = min;
      edt.maxValue = max;
      edt.aiParam = param;
      edt.value = edt.aiParam.val;
      edt.toolTip = util.formatToolTip(tooltip);
      edt.onValueUpdated = function( value )
      {
            edt.aiParam.val = value;
      };

      edt.aiParam.reset = function() {
            edt.value = edt.aiParam.val;
      };

      return edt;
}

function newGenericSpinBox(parent, param, val, min, max, tooltip, onValueUpdated)
{
      var edt = new SpinBox( parent );
      edt.minValue = min;
      edt.maxValue = max;
      edt.aiParam = param;
      edt.value = val;
      edt.toolTip = util.formatToolTip(tooltip);
      edt.onValueUpdated = onValueUpdated;

      return edt;
}

function addArrayToComboBox(cb, arr)
{
      for (var i = 0; i < arr.length; i++) {
            cb.addItem( arr[i] );
      }
}

function newComboBox(parent, param, valarray, tooltip, updatedCallback = null)
{
      var cb = new ComboBox( parent );
      cb.toolTip = util.formatToolTip(tooltip);
      addArrayToComboBox(cb, valarray);
      cb.aiParam = param;
      cb.aiValarray = valarray;
      cb.currentItem = valarray.indexOf(cb.aiParam.val);
      cb.onItemSelected = function( itemIndex ) {
            cb.aiParam.val = cb.aiValarray[itemIndex];
            if (updatedCallback != null) {
                  updatedCallback();
            }
      };

      cb.aiParam.reset = function() {
            cb.currentItem = cb.aiValarray.indexOf(cb.aiParam.val);
      }
      
      return cb;
}

function newComboBoxIndex(parent, param, valarray, tooltip)
{
      var cb = new ComboBox( parent );
      cb.toolTip = util.formatToolTip(tooltip);
      cb.aiParam = param;
      cb.aiValarray = valarray;
      addArrayToComboBox(cb, cb.aiValarray);
      cb.currentItem = cb.aiParam.val;
      cb.onItemSelected = function( itemIndex ) {
            cb.aiParam.val = itemIndex;
      };

      cb.aiParam.reset = function() {
            cb.currentItem = cb.aiParam.val;
      }
      
      return cb;
}

function newComboBoxStrvalsToInt(parent, param, valarray, tooltip)
{
      var cb = new ComboBox( parent );
      cb.toolTip = util.formatToolTip(tooltip);
      cb.aiParam = param;
      cb.aiValarray = valarray;
      addArrayToComboBox(cb, cb.aiValarray);
      cb.currentItem = valarray.indexOf(cb.aiParam.val.toString());
      cb.onItemSelected = function( itemIndex ) {
            cb.aiParam.val = parseInt(cb.aiValarray[itemIndex]);
      };

      cb.aiParam.reset = function() {
            cb.currentItem = cb.aiValarray.indexOf(cb.aiParam.val.toString());
      }
      
      return cb;
}

function newComboBoxpalette(parent, param, valarray, tooltip)
{
      var cb = new ComboBox( parent );
      cb.enabled = true;
      cb.editEnabled = true;
      cb.aiParam = param;
      cb.aiValarray = valarray;
      addArrayToComboBox(cb, cb.aiValarray);
      cb.toolTip = util.formatToolTip(tooltip);
      cb.onEditTextUpdated = function() { 
            cb.aiParam.val = cb.editText.trim(); 
      };
      cb.aiParam.reset = function() {
            cb.editText = cb.aiParam.val;
      }
      return cb;
}

function newPushOrToolButton(parent, icon, txt, tooltip, action, toolbutton)
{
      if (toolbutton) {
            var button = new ToolButton( parent );
      } else {
            var button = new PushButton( parent );
            button.text = txt;
      }
      button.onClick = action;
      if (icon) {
            button.icon = parent.scaledResource( icon );
      }
      button.toolTip = util.formatToolTip(tooltip);

      return button;
}

function newGroupBoxSizer(parent)
{
      var gb = new newGroupBox( parent );
      gb.sizer = new VerticalSizer;
      gb.sizer.margin = 4;
      gb.sizer.spacing = 4;

      return gb;
}

function getSectionVisible(name, control)
{
      if (global.do_not_read_settings) {
            return;
      }
      var tempSetting = Settings.read(name, DataType_Boolean);
      if (Settings.lastReadOK) {
            // console.writeln("AutoIntegrate: read from settings " + name + "=" + tempSetting);
            control.visible = tempSetting;
      }
}

function newSectionBarAdd(parent, groupbox, control, title, name)
{
      var sb = new SectionBar(parent, title);
      sb.setSection(control);
      sb.onToggleSection = function(bar, beginToggle) {
            if (!global.do_not_write_settings) {
                  Settings.write(name, DataType_Boolean, control.visible);
            }
            parent.adjustToContents();
      };
      sb.aiControl = control;
      sb.aiName = name;
      parent.rootingArr.push(sb);

      getSectionVisible(name, control);

      groupbox.sizer.add( sb );
      groupbox.sizer.add( control );

      global.sectionBarControls.push(control);
      global.sectionBars.push(sb);
}

function newSectionBarAddArray(parent, groupbox, title, name, objarray)
{
      var ProcessingControl = new Control( parent );
      ProcessingControl.sizer = new VerticalSizer;
      ProcessingControl.sizer.margin = 6;
      ProcessingControl.sizer.spacing = 4;
      for (var i = 0; i < objarray.length; i++) {
            ProcessingControl.sizer.add( objarray[i] );
      }
      // hide this section by default
      ProcessingControl.visible = false;

      parent.rootingArr.push(ProcessingControl);

      newSectionBarAdd(parent, groupbox, ProcessingControl, title, name);
}

function createGraXperPathSizer(parent)
{
      var graxpertPathLabel = newLabel(parent, "Path", 
            "<p>Path to GraXpert executable.</p>" +
            "<p><b>NOTE!</b> Parameter is automatically saved the persistent module settings. " + 
            "The value is automatically restored when the script starts.</p>"
#ifndef AUTOINTEGRATE_STANDALONE
            + this.skip_reset_tooltip
#endif
            );
      var graxpertPathEdit = newTextEdit(parent, par.graxpert_path, graxpertPathLabel.toolTip);
      var graxpertPathButton = new ToolButton( parent );
      graxpertPathButton.icon = parent.scaledResource(":/icons/select-file.png");
      graxpertPathButton.toolTip = graxpertPathLabel.toolTip;
      graxpertPathButton.setScaledFixedSize( 20, 20 );
      graxpertPathButton.onClick = function()
      {
            var ofd = new OpenFileDialog;
            ofd.multipleSelections = false;
            if (!ofd.execute()) {
                  return;
            }
            graxpertPathEdit.text = ofd.fileName;
            par.graxpert_path.val = ofd.fileName;
            // Save path immediately
            util.saveParameter(par.graxpert_path);
            console.writeln("GraXpert path set to: " + ofd.fileName);
      };

      // Path sizer
      var graxpertPathSizer = newHorizontalSizer(6, true, [ graxpertPathLabel, graxpertPathEdit, graxpertPathButton ]);

      return graxpertPathSizer;
}


function createImageToolsControl(parent)
{
      if (global.debug) console.writeln("AutoIntegrateGUITools::createImageToolsControl");

      if (global.is_gc_process) {
            var use_abe_CheckBox = newCheckBox(parent, "ABE", par.use_abe, 
            "<p>Use AutomaticBackgroundExtractor (ABE) instead of GradientCorrection process to correct gradients in images.</p>" +
            "</p>By default no gradient correction is done. To use ABE for gradient correction you need to also check one of " +
            "the gradient correction options in the <i>Settings / Image processing parameters</i> section.</p>" +
            "<p>Settings for ABE are in <i>Postprocessing / ABE settings</i> section.</p>");
      }
      var use_dbe_CheckBox = newCheckBox(parent, "DBE", par.use_dbe, 
            "<p>Use DynamicBackgroundExtraction (DBE) to correct gradients in images.</p>" +
            "</p>By default no gradient correction is done. To use DBE for gradient correction you need to also check one of " +
            "the gradient correction options in the <i>Settings / Image processing parameters</i> section.</p>" +
            "<p>Sample points are automatically generated for DBE. Settings for DBE are in <i>Postprocessing / DBE settings</i> section.</p>");

      if (global.is_mgc_process) {
            var use_multiscalegradientcorrection_CheckBox = newCheckBox(parent, "MultiscaleGradientCorrection", par.use_multiscalegradientcorrection, 
                  "<p>Use MultiscaleGradientCorrection instead of GradientCorrection process to correct gradients in images.</p>" +
                  "</p>By default no gradient correction is done. To use MultiscaleGradientCorrection for gradient correction you need to also check one of " +
                  "the gradient correction options in the <i>Settings / Image processing parameters</i> section.</p>" +
                  "<p>Settings for MultiscaleGradientCorrection are in <i>Postprocessing / Gradient correction</i> section.</p>" +
                  "<p>Note that you need to set up MARS database settings using the PixInsight MultiscaleGradientCorrection process before " +
                  "using this option.</p>" +
                  this.MGCToolTip);
      }

      var use_StarXTerminator_CheckBox = newCheckBox(parent, "StarXTerminator", par.use_starxterminator, 
            "<p>Use StarXTerminator to remove stars from an image.</p>" +
            "<p>You can change some StarXTerminator settings in the <i>Tools / StarXTerminator</i> section.</p>" );
      var use_noisexterminator_CheckBox = newCheckBox(parent, "NoiseXTerminator", par.use_noisexterminator, 
            "<p>Use NoiseXTerminator for noise reduction.</p>" +
            "<p>You can change noise reduction settings in the <i>Postprocessing / Noise reduction</i> section.</p>" );
      var use_starnet2_CheckBox = newCheckBox(parent, "StarNet2", par.use_starnet2, 
            "<p>Use StarNet2 to remove stars from an image.</p>" );
      var use_deepsnr_CheckBox = newCheckBox(parent, "DeepSNR", par.use_deepsnr, 
            "<p>Use DeepSNR for noise reduction.</p>" +
            "<p>Note that with DeepSNR increasing the noise reduction strength value will decrease the noise reduction.</p>" );
      var use_blurxterminator_CheckBox = newCheckBox(parent, "BlurXTerminator", par.use_blurxterminator, 
            "<p>Use BlurXTerminator for sharpening and deconvolution.</p>" +
            "<p>BlurXTerminator is applied on the linear image just before it is stretched to non-linear. Enhancements " +
            "option for sharpening can be used to apply BlurXTerminator on non-linear image.</p>" +
            "<p>Some options for BlurXTerminator can be adjusted in the <i>Tools / BlurXTerminator</i> section.</p>" +
            "<p>When using BlurXTerminator it is recommended to do noise reduction after BluxXTerminator " + 
            "by checking option <i>Combined image noise reduction</i> or <i>Non-linear noise reduction</i>. " + 
            "But it is always good to experiment what " +
            "is best for your own data.</p>" + 
            "<p>" + this.BXT_no_PSF_tip + "</p>");
      if (global.is_gc_process) {
            var use_graxpert_toolTip = "<p>Use GraXpert instead of GradientCorrection process to correct gradients in images.</p>";
      } else {
            var use_graxpert_toolTip = "<p>Use GraXpert instead of AutomaticBackgroundExtractor (ABE) to correct gradients in images.</p>";
      }
      use_graxpert_toolTip += "</p>By default no gradient correction is done. To use GraXpert for gradient correction you need to also check one of " +
                              "the gradient correction options in the <i>Settings / Image processing parameters</i> section.</p>";
      
      var GraXpert_note = "<p><b>NOTE!</b> A path to GraXpert file must be set in the <i>Tools / GraXpert</i> section before it can be used.</p>" +
                          "<p><b>NOTE2!</b> You need to manually start GraXpert once to ensure that the correct AI model is loaded into your computer.</p>";

      var use_graxpert_CheckBox = newCheckBox(parent, "GraXpert gradient", par.use_graxpert, 
            use_graxpert_toolTip + 
            "<p>GraXpert always uses the AI background model. In the <i>Tools / GraXpert</i> section " +
            "it is possible to set some settings.</p>" +
            GraXpert_note);
      var use_graxpert_denoise_CheckBox = newCheckBox(parent, "GraXpert denoise", par.use_graxpert_denoise, 
            "<p>Use GraXpert for noise reduction.</p>" +
            "<p>In the <i>Tools / GraXpert</i> section it is possible to set some settings.</p>" +
            GraXpert_note);

      var use_graxpert_deconvolution_CheckBox = newCheckBox(parent, "GraXpert deconvolution", par.use_graxpert_deconvolution, 
            "<p>Use GraXpert deconvolution for stellar and non-stellar sharpening.</p>" +
            "<p>In the <i>Tools / GraXpert</i> section it is possible to set some settings.</p>" +
            GraXpert_note);
      // Tools set 1, gradient correction
      var imageToolsSet1SectionLabel = newSectionLabel(parent, "Gradient correction");
      imageToolsSet1SectionLabel.toolTip = "<p>Select tools for gradient correction if you do not want to use the default gradient correction.</p>";
      var imageToolsSet1 = new VerticalSizer;
      imageToolsSet1.margin = 6;
      imageToolsSet1.spacing = 4;
      imageToolsSet1.add( imageToolsSet1SectionLabel );
      if (global.is_gc_process || global.is_mgc_process) {
            if (global.is_gc_process) {
                  imageToolsSet1.add( use_abe_CheckBox );
            }
            imageToolsSet1.add( use_dbe_CheckBox );
            if (global.is_mgc_process) {
                  imageToolsSet1.add( use_multiscalegradientcorrection_CheckBox );
            }
      }
      imageToolsSet1.add( use_graxpert_CheckBox );
      imageToolsSet1.addStretch();

      // Tools set 2, noise removal
      var imageToolsSet2SectionLabel = newSectionLabel(parent, "Noise removal");
      imageToolsSet2SectionLabel.toolTip = "<p>Select tools for noise removal if you do not want to use the default noise removal.</p>" + 
                                                "<p>Note that these are external tools and you need to have them installed and set up correctly.</p>";
      var imageToolsSet2 = new VerticalSizer;
      imageToolsSet2.margin = 6;
      imageToolsSet2.spacing = 4;
      imageToolsSet2.add( imageToolsSet2SectionLabel );
      imageToolsSet2.add( use_noisexterminator_CheckBox );
      imageToolsSet2.add( use_graxpert_denoise_CheckBox );
      imageToolsSet2.add( use_deepsnr_CheckBox );
      imageToolsSet2.addStretch();

      // Tools set 3, star removal
      var imageToolsSet3SectionLabel = newSectionLabel(parent, "Star removal");
      imageToolsSet3SectionLabel.toolTip = "<p>Select tools for star removal.</p>" + 
                                                "<p>Note that these are external tools and you need to have them installed and set up correctly.</p>";
      var imageToolsSet3 = new VerticalSizer;
      imageToolsSet3.margin = 6;
      imageToolsSet3.spacing = 4;
      imageToolsSet3.add( imageToolsSet3SectionLabel );
      imageToolsSet3.add( use_StarXTerminator_CheckBox );
      imageToolsSet3.add( use_starnet2_CheckBox );
      imageToolsSet3.addStretch();

      // Tools set 4, deconvolution
      var imageToolsSet4SectionLabel = newSectionLabel(parent, "Deconvolution/sharpening");
      imageToolsSet4SectionLabel.toolTip = "<p>Select tools for deconvolution and sharpening if you do not want to use the default sharpening.</p>" + 
                                                "<p>Note that these are external tools and you need to have them installed and set up correctly.</p>";
      var imageToolsSet4 = new VerticalSizer;
      imageToolsSet4.margin = 6;
      imageToolsSet4.spacing = 4;
      imageToolsSet4.add( imageToolsSet4SectionLabel );
      imageToolsSet4.add( use_blurxterminator_CheckBox );
      imageToolsSet4.add( use_graxpert_deconvolution_CheckBox );
      imageToolsSet4.addStretch();

      // Tools par.
      var imageToolsControl = new Control( parent );
      imageToolsControl.sizer = new HorizontalSizer;
      imageToolsControl.sizer.margin = 6;
      imageToolsControl.sizer.spacing = 4;
      imageToolsControl.sizer.add( imageToolsSet1 );
      imageToolsControl.sizer.add( imageToolsSet2 );
      imageToolsControl.sizer.add( imageToolsSet3 );
      imageToolsControl.sizer.add( imageToolsSet4 );
      imageToolsControl.sizer.addStretch();

      return imageToolsControl;
}

this.newVerticalSizer = newVerticalSizer;
this.newHorizontalSizer = newHorizontalSizer;
this.newCheckBox = newCheckBox;
this.newCheckBoxEx = newCheckBoxEx;
this.newGenericCheckBox = newGenericCheckBox;
this.newGroupBox = newGroupBox;
this.newSectionLabel = newSectionLabel;
this.newLabel = newLabel;
this.newTextEdit = newTextEdit;
this.newGenericTextEdit = newGenericTextEdit;
this.newNumericEdit = newNumericEdit;
this.newNumericEditPrecision = newNumericEditPrecision;
this.newRGBNBNumericEdit = newRGBNBNumericEdit;
this.newNumericControl2 = newNumericControl2;
this.newNumericControl3 = newNumericControl3;
this.newSpinBox = newSpinBox;
this.newGenericSpinBox = newGenericSpinBox;
this.newComboBox = newComboBox;
this.newComboBoxIndex = newComboBoxIndex;
this.addArrayToComboBox = addArrayToComboBox;
this.newComboBoxStrvalsToInt = newComboBoxStrvalsToInt;
this.newComboBoxpalette = newComboBoxpalette;
this.newPushOrToolButton = newPushOrToolButton;
this.newGroupBoxSizer = newGroupBoxSizer;
this.newSectionBarAdd = newSectionBarAdd;
this.newSectionBarAddArray = newSectionBarAddArray;

this.createImageToolsControl = createImageToolsControl;
this.createGraXperPathSizer = createGraXperPathSizer;

}

AutoIntegrateGUITools.prototype = new Object;
