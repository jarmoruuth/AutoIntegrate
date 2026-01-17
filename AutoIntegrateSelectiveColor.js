/*
    A PixInsight implementation of Photoshop's Selective Color adjustment.
    Allows targeted adjustments to specific color ranges using CMYK-like controls.

    Copyright (C)) 2025 Jarmo Ruuth
*/

#ifndef AUTOINTEGRATESELECTIVECOLOR_JS
#define AUTOINTEGRATESELECTIVECOLOR_JS

function AutoIntegrateSelectiveColor(guitools, util, global, preview)
{

this.__base__ = Object;
this.__base__();

var self = this;

var par = global.par;

// Color ranges matching Photoshop
let ColorRange = {
   REDS: 0,
   YELLOWS: 1,
   GREENS: 2,
   CYANS: 3,
   BLUES: 4,
   MAGENTAS: 5,
   WHITES: 6,
   NEUTRALS: 7,
   BLACKS: 8
};

let ColorRangeNames = [
   "Reds", "Yellows", "Greens", "Cyans", "Blues", "Magentas",
   "Whites", "Neutrals", "Blacks"
];

// Adjustment modes
let AdjustmentMode = {
   RELATIVE: 0,
   ABSOLUTE: 1
};

var selective_color_preset_values = [ 'None', 'Gold and Blue' ];

function SelectiveColorData() {
   // Store adjustments for each color range
   // Each range has CMYK adjustments: [C, M, Y, K]
   this.adjustments = {};
   for (let i = 0; i < ColorRangeNames.length; i++) {
      this.adjustments[i] = [0, 0, 0, 0]; // C, M, Y, K
   }
   
   this.mode = AdjustmentMode.RELATIVE;
   this.currentRange = ColorRange.REDS;
}

SelectiveColorData.prototype.clone = function() {
   let copy = new SelectiveColorData();
   copy.mode = this.mode;
   copy.currentRange = this.currentRange;
   for (let i = 0; i < ColorRangeNames.length; i++) {
      copy.adjustments[i] = this.adjustments[i].slice();
   }
   return copy;
};

// Smooth hue-based weight calculation with cosine interpolation
function smoothHueWeight(h, centerHue, rangeSize, falloffSize) {
   // Calculate angular distance considering 360-degree wraparound
   let dist = Math.abs(h - centerHue);
   if (dist > 180) dist = 360 - dist;
   
   if (dist <= rangeSize / 2) {
      // Full weight in center
      return 1.0;
   } else if (dist <= rangeSize / 2 + falloffSize) {
      // Smooth falloff using cosine
      let t = (dist - rangeSize / 2) / falloffSize;
      return (Math.cos(t * Math.PI) + 1) / 2;
   }
   return 0;
}

// Create color range mask based on hue/saturation/lightness
function createColorRangeMask(image, colorRange) {
   let width = image.width;
   let height = image.height;
   
   // Convert to HSV for easier color range selection
   let img = new Image(width, height, 3, ColorSpace_RGB);
   img.apply(image);
   
   let mask = new Image(width, height, 1, ColorSpace_Gray);
   mask.fill(0);
   
   // Get RGB samples
   let R = new Vector(width * height);
   let G = new Vector(width * height);
   let B = new Vector(width * height);
   
   img.getSamples(R, new Rect(0, 0, width, height), 0);
   img.getSamples(G, new Rect(0, 0, width, height), 1);
   img.getSamples(B, new Rect(0, 0, width, height), 2);
   
   let maskData = new Vector(width * height);
   
   for (let i = 0; i < width * height; i++) {
      let r = R.at(i);
      let g = G.at(i);
      let b = B.at(i);
      
      let max = Math.max(r, g, b);
      let min = Math.min(r, g, b);
      let delta = max - min;
      
      // Calculate HSV
      let h = 0, s = 0, v = max;
      
      if (delta > 0.001) {
         s = delta / max;
         
         if (r === max)
            h = (g - b) / delta;
         else if (g === max)
            h = 2 + (b - r) / delta;
         else
            h = 4 + (r - g) / delta;
         
         h *= 60;
         if (h < 0) h += 360;
      }
      
      let weight = 0;
      
      switch (colorRange) {
         case ColorRange.REDS:
            // Reds: centered at 0/360 degrees
            weight = smoothHueWeight(h, 0, 30, 30);
            weight *= Math.min(s * 1.5, 1);
            weight *= (v > 0.1 ? 1 : v / 0.1);
            break;
            
         case ColorRange.YELLOWS:
            // Yellows: centered at 60 degrees
            weight = smoothHueWeight(h, 60, 30, 30);
            weight *= Math.min(s * 1.5, 1);
            weight *= (v > 0.1 ? 1 : v / 0.1);
            break;
            
         case ColorRange.GREENS:
            // Greens: centered at 135 degrees
            weight = smoothHueWeight(h, 135, 60, 30);
            weight *= Math.min(s * 1.5, 1);
            weight *= (v > 0.1 ? 1 : v / 0.1);
            break;
            
         case ColorRange.CYANS:
            // Cyans: centered at 180 degrees
            weight = smoothHueWeight(h, 180, 30, 30);
            weight *= Math.min(s * 1.5, 1);
            weight *= (v > 0.1 ? 1 : v / 0.1);
            break;
            
         case ColorRange.BLUES:
            // Blues: centered at 255 degrees
            weight = smoothHueWeight(h, 255, 60, 30);
            weight *= Math.min(s * 1.5, 1);
            weight *= (v > 0.1 ? 1 : v / 0.1);
            break;
            
         case ColorRange.MAGENTAS:
            // Magentas: centered at 315 degrees
            weight = smoothHueWeight(h, 315, 60, 30);
            weight *= Math.min(s * 1.5, 1);
            weight *= (v > 0.1 ? 1 : v / 0.1);
            break;
            
         case ColorRange.WHITES:
            // Whites: high value, low saturation with smooth falloff
            if (v > 0.6 && s < 0.4) {
               let vWeight = (v > 0.85) ? 1 : (v - 0.6) / 0.25;
               let sWeight = (s < 0.15) ? 1 : (0.4 - s) / 0.25;
               // Smooth the transition using cosine
               vWeight = (1 - Math.cos(vWeight * Math.PI)) / 2;
               sWeight = (1 - Math.cos(sWeight * Math.PI)) / 2;
               weight = vWeight * sWeight;
            }
            break;
            
         case ColorRange.NEUTRALS:
            // Neutrals: mid value, low saturation with smooth falloff
            if (v > 0.15 && v < 0.85 && s < 0.4) {
               let vCenter = 0.5;
               let vDist = Math.abs(v - vCenter);
               let vWeight = (vDist < 0.2) ? 1 : Math.max(0, (0.35 - vDist) / 0.15);
               let sWeight = (s < 0.15) ? 1 : (0.4 - s) / 0.25;
               // Smooth the transition using cosine
               vWeight = (1 - Math.cos(vWeight * Math.PI)) / 2;
               sWeight = (1 - Math.cos(sWeight * Math.PI)) / 2;
               weight = vWeight * sWeight;
            }
            break;
            
         case ColorRange.BLACKS:
            // Blacks: low value with smooth falloff
            if (v < 0.4) {
               weight = (v < 0.15) ? 1 : (0.4 - v) / 0.25;
               // Smooth the transition using cosine
               weight = (1 - Math.cos(weight * Math.PI)) / 2;
            }
            break;
      }
      
      maskData.at(i, Math.max(0, Math.min(1, weight)));
   }
   
   mask.setSamples(maskData, new Rect(0, 0, width, height), 0);
   
   // Apply additional blur to smooth the mask even more
   let P = new Convolution;
   P.mode = Convolution.prototype.Parametric;
   P.sigma = 1.0;
   P.shape = 2.0;
   P.aspectRatio = 1.0;
   P.rotationAngle = 0.0;
   
   // Create a temporary window for the mask - grayscale needs 1 channel, not 0
   let tempWin = new ImageWindow(width, height, 1, 32, true, false, "temp_mask");
   let tempView = tempWin.mainView;
   tempView.beginProcess();
   tempView.image.apply(mask);
   tempView.endProcess();
   
   // Apply convolution
   P.executeOn(tempView);
   
   // Get the smoothed result
   mask.apply(tempView.image);
   tempWin.forceClose();
   
   return mask;
}

// Apply CMYK adjustments to image using mask
function applySelectiveColorAdjustment(image, colorRange, cmykAdjust, mode) {
   if (cmykAdjust[0] == 0 && cmykAdjust[1] == 0 && cmykAdjust[2] == 0 && cmykAdjust[3] == 0)
      return; // No adjustment needed
   
   let mask = createColorRangeMask(image, colorRange);
   
   // Get RGB channels
   let width = image.width;
   let height = image.height;
   let numPixels = width * height;
   
   let R = new Vector(numPixels);
   let G = new Vector(numPixels);
   let B = new Vector(numPixels);
   
   image.getSamples(R, new Rect(0, 0, width, height), 0);
   image.getSamples(G, new Rect(0, 0, width, height), 1);
   image.getSamples(B, new Rect(0, 0, width, height), 2);
   
   let maskData = new Vector(numPixels);
   mask.getSamples(maskData, new Rect(0, 0, width, height), 0);
   
   // Normalize adjustments to -1 to +1 range
   let cAdj = cmykAdjust[0] / 100;
   let mAdj = cmykAdjust[1] / 100;
   let yAdj = cmykAdjust[2] / 100;
   let kAdj = cmykAdjust[3] / 100;
   
   for (let i = 0; i < numPixels; i++) {
      let weight = maskData.at(i);
      if (weight < 0.001) continue;
      
      let r = R.at(i);
      let g = G.at(i);
      let b = B.at(i);
      
      // Work in RGB space directly for more intuitive results
      // Cyan affects red channel (opposite)
      // Magenta affects green channel (opposite)
      // Yellow affects blue channel (opposite)
      
      if (mode == AdjustmentMode.RELATIVE) {
         // Relative mode: percentage of existing color
         // For CMY, we adjust the opposite RGB channel
         // Positive cyan reduces red, negative cyan increases red
         if (cAdj != 0) {
            if (cAdj > 0) {
               // Add cyan = reduce red proportionally
               r -= r * cAdj * weight;
            } else {
               // Remove cyan = add red proportionally
               r += (1 - r) * (-cAdj) * weight;
            }
         }
         
         if (mAdj != 0) {
            if (mAdj > 0) {
               // Add magenta = reduce green proportionally
               g -= g * mAdj * weight;
            } else {
               // Remove magenta = add green proportionally
               g += (1 - g) * (-mAdj) * weight;
            }
         }
         
         if (yAdj != 0) {
            if (yAdj > 0) {
               // Add yellow = reduce blue proportionally
               b -= b * yAdj * weight;
            } else {
               // Remove yellow = add blue proportionally
               b += (1 - b) * (-yAdj) * weight;
            }
         }
         
         // Black adjustment darkens/lightens all channels
         if (kAdj != 0) {
            if (kAdj > 0) {
               // Add black = darken proportionally
               let kFactor = 1 - (kAdj * weight);
               r *= kFactor;
               g *= kFactor;
               b *= kFactor;
            } else {
               // Remove black = lighten proportionally
               let kFactor = -kAdj * weight;
               r += (1 - r) * kFactor;
               g += (1 - g) * kFactor;
               b += (1 - b) * kFactor;
            }
         }
      } else {
         // Absolute mode: direct addition/subtraction
         if (cAdj != 0) {
            r -= cAdj * weight;
         }
         
         if (mAdj != 0) {
            g -= mAdj * weight;
         }
         
         if (yAdj != 0) {
            b -= yAdj * weight;
         }
         
         if (kAdj != 0) {
            let kChange = kAdj * weight;
            r -= kChange;
            g -= kChange;
            b -= kChange;
         }
      }
      
      // Clamp to valid range
      R.at(i, Math.max(0, Math.min(1, r)));
      G.at(i, Math.max(0, Math.min(1, g)));
      B.at(i, Math.max(0, Math.min(1, b)));
   }
   
   image.setSamples(R, new Rect(0, 0, width, height), 0);
   image.setSamples(G, new Rect(0, 0, width, height), 1);
   image.setSamples(B, new Rect(0, 0, width, height), 2);
}

function SelectiveColorEngine() {
    if (par.enhancements_selective_color_data.val != null) {
        console.writeln("Loading existing Selective Color data" + JSON.stringify(par.enhancements_selective_color_data.val)); 
        this.data = par.enhancements_selective_color_data.val;
    } else {
        console.writeln("Creating new Selective Color data");
        this.data = new SelectiveColorData();
        par.enhancements_selective_color_data.val = this.data;
    }
    par.enhancements_selective_color_data.def = new SelectiveColorData();
    par.enhancements_selective_color_data.is_changed_callback = function(param) {
        // Compare current data with default
        let def = param.def;
        let cur = param.val;
        if (cur.mode != def.mode) {
            console.writeln("Selective Color mode changed");
            return true;
        }
        for (let i = 0; i < ColorRangeNames.length; i++) {
            let adjCur = cur.adjustments[i];
            let adjDef = def.adjustments[i];
            for (let j = 0; j < 4; j++) {
                if (adjCur[j] != adjDef[j]) {
                    console.writeln("Selective Color adjustment changed for " + ColorRangeNames[i] + " channel " + j);
                    return true;
                }
            }
        }
        console.writeln("Selective Color data unchanged");
        return false;
    }
}

SelectiveColorEngine.prototype.apply = function(view) {
   console.noteln("Applying Selective Color...");
   
   view.beginProcess(UndoFlag_NoSwapFile);
   
   let image = view.image;
   
   // Apply adjustments for each color range that has changes
   for (let range = 0; range < ColorRangeNames.length; range++) {
      let adj = this.data.adjustments[range];
      if (adj[0] != 0 || adj[1] != 0 || adj[2] != 0 || adj[3] != 0) {
         console.writeln("Adjusting " + ColorRangeNames[range] + 
                        ": C=" + adj[0] + " M=" + adj[1] + 
                        " Y=" + adj[2] + " K=" + adj[3]);
         // Divide adjustment by 3 to make them comparable to Photoshop and to avoid overcorrection
         adj = [ adj[0] / 3, adj[1] / 3, adj[2] / 3, adj[3] / 3 ];
         applySelectiveColorAdjustment(image, range, adj, this.data.mode);
      }
   }
   
   view.endProcess();
   console.noteln("Selective Color Done.");
};

function selectiveColorPreview() {
    // make a copy if the current image
    if (global.enhancements_target_image_id == 'Auto') {
        console.criticalln("AutoIntegrateSelectiveColor: No image open for preview.");
        return
    }
    console.writeln("Generating Selective Color preview...");
    var enhancementsWin = ImageWindow.windowById(global.enhancements_target_image_id);
    var originalWin = enhancementsWin;

    var imageId = originalWin.mainView.id + "_SelectiveColorPreview";
    util.closeOneWindowById(imageId);
    var copyWin = util.copyWindow(originalWin, imageId);

    // Process the copy
    console.writeln("Applying Selective Color to preview image...");
    self.engine.apply(copyWin.mainView);

    // Show the preview window
    preview.updatePreviewWin(copyWin);

    util.closeOneWindow(copyWin);
    util.runGarbageCollection();
}

function createSelectiveColorSizer(parent, selectiveColorEngine) {
    
    this.engine = selectiveColorEngine;
    this.par = par;

#ifndef AUTOINTEGRATE_STANDALONE
    this.selectiveCColorCheckBox = guitools.newCheckBox(parent, "Selective color", par.enhancements_selective_color, 
            "<p>Enhance colors.</p>");
#endif // AUTOINTEGRATE_STANDALONE

    this.selectiveColorPresetLabel = guitools.newLabel(parent, "Presets", "");
    this.selectiveColorPresetComboBox = guitools.newComboBox(parent, par.enhancements_selective_color_preset, selective_color_preset_values, "");
    this.selectiveColorPresetComboBox.onItemSelected = function( itemIndex )
    {
        switch (selective_color_preset_values[itemIndex]) {
                case 'None':
                    // Reset all adjustments
                    for (let i = 0; i < ColorRangeNames.length; i++) {
                        self.engine.data.adjustments[i] = [0, 0, 0, 0];
                    }
                    self.updateAdjustmentControls();
                    break;
                case 'Gold and Blue':
                    // Gold and Blue preset
                    self.engine.data.adjustments[ColorRange.YELLOWS] = [-100,25,0,0];
                    self.engine.data.adjustments[ColorRange.GREENS] = [-100,-25,0,0];
                    self.engine.data.adjustments[ColorRange.CYANS] = [-1,-25,-100,0];
                    self.updateAdjustmentControls();
                    break;
                case 'Eagle':
                    break;
                default:
                    util.throwFatalError("Unknown preset " + selective_color_preset_values[itemIndex]);
                    break;
        }
    }

    this.topSizer = new HorizontalSizer;
    this.topSizer.spacing = 4;
#ifndef AUTOINTEGRATE_STANDALONE
    this.topSizer.add(this.selectiveCColorCheckBox);
    this.topSizer.addSpacing(20);
#endif // AUTOINTEGRATE_STANDALONE
    this.topSizer.add(this.selectiveColorPresetLabel);
    this.topSizer.add(this.selectiveColorPresetComboBox);
    this.topSizer.addStretch();

    let labelWidth1 = parent.font.width("Method:M");
    
    // Color range selector
    this.colorLabel = new Label(parent);
    this.colorLabel.text = "Colors:";
    this.colorLabel.textAlignment = TextAlign_Right | TextAlign_VertCenter;
    this.colorLabel.minWidth = labelWidth1;
    
    this.colorCombo = new ComboBox(parent);
    for (let i = 0; i < ColorRangeNames.length; i++) {
        this.colorCombo.addItem(ColorRangeNames[i]);
    }
    this.colorCombo.currentItem = self.engine.data.currentRange;
    this.colorCombo.onItemSelected = function(index) {
        self.engine.data.currentRange = index;
        self.updateAdjustmentControls();
    };
    
    this.colorSizer = new HorizontalSizer;
    this.colorSizer.spacing = 4;
    this.colorSizer.add(this.colorLabel);
    this.colorSizer.add(this.colorCombo, 100);
    this.colorSizer.addStretch();
    
    // Method selector
    this.methodLabel = new Label(parent);
    this.methodLabel.text = "Method:";
    this.methodLabel.textAlignment = TextAlign_Right | TextAlign_VertCenter;
    this.methodLabel.minWidth = labelWidth1;
    
    this.methodCombo = new ComboBox(parent);
    this.methodCombo.addItem("Relative");
    this.methodCombo.addItem("Absolute");
    this.methodCombo.currentItem = self.engine.data.mode;
    this.methodCombo.toolTip = "<p>Relative: Adjusts based on existing color amount<br/>" +
                                "Absolute: Direct color addition</p>";
    this.methodCombo.onItemSelected = function(index) {
        self.engine.data.mode = index;
    };
    
    this.methodSizer = new HorizontalSizer;
    this.methodSizer.spacing = 4;
    this.methodSizer.add(this.methodLabel);
    this.methodSizer.add(this.methodCombo, 100);
    this.methodSizer.addStretch();
    
    // Helper function to create a color hint box
    this.createColorBox = function(r, g, b) {
        let box = new Control(parent);
        box.setFixedSize(20, 20);
        box.backgroundColor = 0xff000000 | (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
        return box;
    };
    
    // CMYK sliders with color hints
    this.createSlider = function(label, channel, negColor, posColor) {
        let label_control = new Label(parent);
        label_control.text = label + ":";
        label_control.textAlignment = TextAlign_Right | TextAlign_VertCenter;
        label_control.minWidth = labelWidth1;
        
        // Negative color hint (left side)
        let negBox = this.createColorBox(negColor[0], negColor[1], negColor[2]);
        
        let numericControl = new NumericControl(parent);
        numericControl.label.text = "";
        numericControl.setRange(-100, 100);
        numericControl.slider.setRange(-100, 100);
        numericControl.slider.minWidth = 250;
        numericControl.setPrecision(0);
        numericControl.setValue(0);
        numericControl.onValueUpdated = function(value) {
            self.engine.data.adjustments[self.engine.data.currentRange][channel] = value;
        };
        
        // Positive color hint (right side)
        let posBox = this.createColorBox(posColor[0], posColor[1], posColor[2]);
        
        let sizer = new HorizontalSizer;
        sizer.spacing = 4;
        sizer.add(label_control);
        sizer.add(negBox);
        sizer.add(numericControl, 100);
        sizer.add(posBox);
        sizer.addStretch();
        
        return { sizer: sizer, control: numericControl };
    };
    
    // Create controls with color hints
    // Cyan: negative = Red (1,0,0), positive = Cyan (0,1,1)
    this.cyanControl = this.createSlider("Cyan", 0, [1, 0, 0], [0, 1, 1]);
    
    // Magenta: negative = Green (0,1,0), positive = Magenta (1,0,1)
    this.magentaControl = this.createSlider("Magenta", 1, [0, 1, 0], [1, 0, 1]);
    
    // Yellow: negative = Blue (0,0,1), positive = Yellow (1,1,0)
    this.yellowControl = this.createSlider("Yellow", 2, [0, 0, 1], [1, 1, 0]);
    
    // Black: negative = White (1,1,1), positive = Black (0,0,0)
    this.blackControl = this.createSlider("Black", 3, [1, 1, 1], [0, 0, 0]);
    
    this.updateAdjustmentControls = function() {
        let adj = self.engine.data.adjustments[self.engine.data.currentRange];
        self.cyanControl.control.setValue(adj[0]);
        self.magentaControl.control.setValue(adj[1]);
        self.yellowControl.control.setValue(adj[2]);
        self.blackControl.control.setValue(adj[3]);
    };

    this.updateAllAdjustmentControls = function(param) {
        self.engine.data = param.val;
        self.engine.data.currentRange = 0;
        self.updateAdjustmentControls();
    };

    // Reset current button
    this.resetButton = new PushButton(parent);
    this.resetButton.text = "Reset Current";
    this.resetButton.toolTip = "Reset adjustments for current color range";
    this.resetButton.onClick = function() {
        self.engine.data.adjustments[self.engine.data.currentRange] = [0, 0, 0, 0];
        self.updateAdjustmentControls();
    };
    
    // Reset all button
    this.resetAllButton = new PushButton(parent);
    this.resetAllButton.text = "Reset All";
    this.resetAllButton.toolTip = "Reset all color range adjustments";
    this.resetAllButton.onClick = function() {
        for (let i = 0; i < ColorRangeNames.length; i++) {
            self.engine.data.adjustments[i] = [0, 0, 0, 0];
        }
        self.updateAdjustmentControls();
    };
    
    // Preview button
    this.previewButton = new PushButton(parent);
    this.previewButton.text = "Preview";
    this.previewButton.onClick = function() {
        selectiveColorPreview();
    };
    
    this.buttonsSizer = new HorizontalSizer;
    this.buttonsSizer.spacing = 6;
    this.buttonsSizer.add(this.resetButton);
    this.buttonsSizer.add(this.resetAllButton);
    this.buttonsSizer.addSpacing(20);
    this.buttonsSizer.add(this.previewButton);
    this.buttonsSizer.addStretch();
    
    // Main sizer
    this.sizer = new VerticalSizer;
    this.sizer.margin = 8;
    this.sizer.spacing = 6;
    this.sizer.add(this.topSizer);
    this.sizer.addSpacing(4);
    this.sizer.add(this.colorSizer);
    this.sizer.add(this.methodSizer);
    this.sizer.addSpacing(8);
    this.sizer.add(this.cyanControl.sizer);
    this.sizer.add(this.magentaControl.sizer);
    this.sizer.add(this.yellowControl.sizer);
    this.sizer.add(this.blackControl.sizer);
    this.sizer.addSpacing(8);
    this.sizer.add(this.buttonsSizer);
    this.sizer.addStretch();

    par.enhancements_selective_color_data.set_callback = function(param) {
        if (global.debug) console.writeln("Selective Color data changed, updating controls");
        self.updateAllAdjustmentControls(param);
    }
    util.recordParam(par.enhancements_selective_color_data);
    this.updateAllAdjustmentControls(par.enhancements_selective_color_data);
    
    return this.sizer;
}

function createSelectiveColorEngine() {
    return new SelectiveColorEngine();
}

function setPreset(name) {
    this.selectiveColorPresetComboBox.onItemSelected( selective_color_preset_values.indexOf(name) );
}

this.createSelectiveColorEngine = createSelectiveColorEngine;
this.createSelectiveColorSizer = createSelectiveColorSizer;

this.setPreset = setPreset;     // For testing purposes

}  /* AutoIntegrateSelectiveColor */

AutoIntegrateSelectiveColor.prototype = new Object;

#endif // AUTOINTEGRATESELECTIVECOLOR_JS
