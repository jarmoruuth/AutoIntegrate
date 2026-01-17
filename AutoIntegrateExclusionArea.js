// AutoIntegrateExclusionArea.js
// Script for drawing and managing user exclusion areas in PixInsight
// 
// This script allows the user to:
// 1. Draw polygonal exclusion areas on an image
// 2. Clear exclusion areas
// 3. Apply processing with exclusion regions

#ifndef AUTOINTEGRATEEXCLUSIONAREA_JS
#define AUTOINTEGRATEEXCLUSIONAREA_JS

function AutoIntegrateExclusionArea(util)
{

this.__base__ = Object;
this.__base__();

var dialog;

// Global variables
var exclusionAreaPolygons = []; // Array of arrays, each containing points for a polygon
var activePolygon = []; // Current polygon being drawn
var isDrawing = false;
var targetView = null;
var targetWindow = null;
var previewControl = null;
var title = "AutoIntegrate Exclusion Area";
var scale = 1.0;

// Main function - creates the script dialog
function ExclusionAreaDialog() {
   this.__base__ = Dialog;
   this.__base__();

   var labelWidth = this.font.width("Exclusion areas: 000") + 4;
   
   // UI components
   this.helpLabel = new Label(this);
   // this.helpLabel.text = "Click on the image to define polygon vertices. Double-click to close polygon.";
   this.helpLabel.text = "Click on the image to define polygon vertices.";
   this.helpLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   
   this.targetImage_Label = new Label(this);
   this.targetImage_Label.text = "Target image:";
   this.targetImage_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   this.targetImage_Label.minWidth = labelWidth;
   
   this.targetImage_Info = new Label(this);
  
   if (targetView && targetWindow) {
      this.targetImage_Info.text = targetWindow.mainView.id;
      setPreviewForView();
   } else {
      this.targetImage_Info.text = "No active image";
   }
   
   this.startDrawing_Button = new PushButton(this);
   var startDrawing_Button = this.startDrawing_Button;
   this.startDrawing_Button.text = "Start Drawing";
   this.startDrawing_Button.icon = this.scaledResource(":/icons/window-new.png");
   this.startDrawing_Button.onClick = function() {
      if (!targetView) {
         (new MessageBox("No active image. Please open an image first.", title, StdIcon_Error)).execute();
         return;
      }
      
      activePolygon = [];
      lastMousePos = null;
      isDrawing = true;
      
      // Enable real-time preview to show drawing
      installPolygonHandler();
      
      startDrawing_Button.enabled = false;
      finishDrawing_Button.enabled = true;
      cancelDrawing_Button.enabled = true;
   };
   
   this.finishDrawing_Button = new PushButton(this);
   var finishDrawing_Button = this.finishDrawing_Button;
   this.finishDrawing_Button.text = "Finish Current Polygon";
   this.finishDrawing_Button.icon = this.scaledResource(":/icons/ok.png");
   this.finishDrawing_Button.enabled = false;
   this.finishDrawing_Button.onClick = function() {
      finishPolygon();
   };
   
   this.cancelDrawing_Button = new PushButton(this);
   var cancelDrawing_Button = this.cancelDrawing_Button;
   this.cancelDrawing_Button.text = "Cancel Drawing";
   this.cancelDrawing_Button.icon = this.scaledResource(":/icons/cancel.png");
   this.cancelDrawing_Button.enabled = false;
   this.cancelDrawing_Button.onClick = function() {
      activePolygon = [];
      isDrawing = false;
      uninstallPolygonHandler();
      updatePreview();
      
      this.dialog.startDrawing_Button.enabled = true;
      this.dialog.finishDrawing_Button.enabled = false;
      this.dialog.cancelDrawing_Button.enabled = false;
   };
   
   this.exclusionCount_Label = new Label(this);
   this.exclusionCount_Label.text = "Exclusion areas: " + exclusionAreaPolygons.length;
   this.exclusionCount_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   
   this.preview_Control = new Control(this);
   
   // Make the preview match the image dimensions
   // Calculate a suitable preview size that maintains aspect ratio
   var imgWidth = targetView.image.width;
   var imgHeight = targetView.image.height;
   
   // Set the preview size
   this.preview_Control.setFixedSize(Math.round(imgWidth * scale), Math.round(imgHeight * scale));
   
   this.preview_Control.backgroundcolor = 0xFF000000;
   this.preview_Control.toolTip = "Preview of exclusion areas";
   this.preview_Control.onPaint = function() {
      drawPreview(this);
   };
   previewControl = this.preview_Control;
   
   this.clearAll_Button = new PushButton(this);
   this.clearAll_Button.text = "Clear All Areas";
   this.clearAll_Button.icon = this.scaledResource(":/icons/delete.png");
   this.clearAll_Button.onClick = function() {
      if (exclusionAreaPolygons.length > 0) {
         if ((new MessageBox("Do you really want to delete all exclusion areas?",
               title, StdIcon_Warning, StdButton_Yes, StdButton_No)).execute() == StdButton_Yes) {
            exclusionAreaPolygons = [];
            updateExclusionCount();
            updatePreview();
         }
      }
   };
   
   this.dialog_ok_Button = new PushButton(this);
   this.dialog_ok_Button.text = "OK";
   this.dialog_ok_Button.icon = this.scaledResource(":/icons/ok.png");
   this.dialog_ok_Button.onClick = function() {
      this.dialog.ok();
   };
   this.dialog_cancel_Button = new PushButton(this);
   this.dialog_cancel_Button.text = "Cancel";
   this.dialog_cancel_Button.icon = this.scaledResource(":/icons/cancel.png");
   this.dialog_cancel_Button.onClick = function() {
      this.dialog.cancel();
   };
   
   // Dialog layout
   this.sizer = new VerticalSizer;
   this.sizer.margin = 8;
   this.sizer.spacing = 6;
   
   // Help text
   this.sizer.add(this.helpLabel);
   this.sizer.addSpacing(4);
   
   // Target selection
   var targetSizer = new HorizontalSizer;
   targetSizer.spacing = 4;
   targetSizer.add(this.targetImage_Label);
   targetSizer.add(this.targetImage_Info, 100);
   this.sizer.add(targetSizer);
   this.sizer.addSpacing(8);
   
   // Drawing controls
   var drawingSizer = new HorizontalSizer;
   drawingSizer.spacing = 4;
   drawingSizer.add(this.startDrawing_Button);
   drawingSizer.add(this.finishDrawing_Button);
   drawingSizer.add(this.cancelDrawing_Button);
   drawingSizer.addStretch();
   drawingSizer.add(this.exclusionCount_Label);
   this.sizer.add(drawingSizer);
   this.sizer.addSpacing(4);
   
   // Preview
   var previewSizer = new HorizontalSizer;
   previewSizer.add(this.preview_Control, 100);
   this.sizer.add(previewSizer, 100);
   this.sizer.addSpacing(4);
   
   // Area management
   var managementSizer = new HorizontalSizer;
   managementSizer.spacing = 4;
   managementSizer.add(this.clearAll_Button);
   managementSizer.addStretch();
   managementSizer.add(this.dialog_ok_Button);
   managementSizer.add(this.dialog_cancel_Button);
   this.sizer.add(managementSizer);
   
   this.windowTitle = title;
   this.adjustToContents();
}

// Inherit all properties and methods from the Dialog object
ExclusionAreaDialog.prototype = new Dialog;

// Helper function to draw the preview
function drawPreview(control) {
   if (!targetView) return;

   // console.writeln("Drawing preview...");

   var bitmap = targetView.image.render().scaledTo(control.width, control.height);
   
   var g = new Graphics(bitmap);
   
   var offsetX = control.width  / 2;
   var offsetY = control.height  / 2;
   
   // Draw existing exclusion areas
   g.pen = new Pen(0xFFFF6600, 1);
   
   for (var i = 0; i < exclusionAreaPolygons.length; i++) {
      var polygon = exclusionAreaPolygons[i];
      if (polygon.length > 0) {
         for (var j = 1; j < polygon.length; j++) {
            // console.writeln("Drawing line: " + polygon[j-1].x + ", " + polygon[j-1].y + " to " + polygon[j].x + ", " + polygon[j].y);
            g.drawLine(polygon[j-1].x, polygon[j-1].y, polygon[j].x, polygon[j].y);
         }
      }
   }
   
   // Draw the active polygon being created
   if (activePolygon.length > 0) {
      g.pen = new Pen(0xFFFFFF00, 1);
      
      for (var j = 1; j < activePolygon.length; j++) {
         // console.writeln("Drawing active line: " + activePolygon[j-1].x + ", " + activePolygon[j-1].y + " to " + activePolygon[j].x + ", " + activePolygon[j].y);
         g.drawLine(activePolygon[j-1].x, activePolygon[j-1].y, activePolygon[j].x, activePolygon[j].y);
      }
      
      // Draw a line to the current mouse position if we're drawing
      if (0 && isDrawing && lastMousePos) {
         let last = activePolygon[activePolygon.length - 1];
         let mousePos = lastMousePos;
         // console.writeln("Drawing line to last mouse position: " + last.x + ", " + last.y + " to " + mousePos.x + ", " + mousePos.y);
         g.drawLine(last.x, last.y, mousePos.x, mousePos.y);
      }
   }
   
   g.end();

   var graphics = new Graphics(control);
   //graphics.drawBitmap(offsetX, offsetY, bitmap);
   graphics.drawBitmap(0, 0, bitmap);
   graphics.end();

   // console.writeln("Preview drawn.");
}

// Track mouse position
var lastMousePos = null;

// Setup mouse event handlers for drawing
function installPolygonHandler() {
   if (!targetWindow) return;
   
   // Mouse press handler - add points to the active polygon
   previewControl.onMousePress = function(x, y, button, buttons, modifiers) {
      // console.writeln("Mouse Press: " + x + ", " + y);
      if (!isDrawing) return false;
      // if (button != MouseButton_Left) return false;
      
      if (0) {
         // Double click closes the polygon
         var now = Date.now();
         if (targetWindow.lastClickTime && now - targetWindow.lastClickTime < 300 && activePolygon.length > 2) {
            finishPolygon();
            return true;
         }
         targetWindow.lastClickTime = now;
      }
      // Check if the point is already in the polygon
      for (var i = 0; i < activePolygon.length; i++) {
         if (activePolygon[i].x == x && activePolygon[i].y == y) {
            // console.writeln("Point already in polygon: " + x + ", " + y);
            return false; // Ignore duplicate points
         }
      }      
      // Add point to active polygon
      activePolygon.push({ x: x, y: y });
      updatePreview();
      
      return true;
   };
   
   // Mouse move handler - track mouse position for live preview
   previewControl.onMouseMove = function(x, y, buttons, modifiers) {
      if (!isDrawing) return false;
      
      // console.writeln("Mouse Pos: " + x + ", " + y);
      // lastMousePos = { x: x, y: y };
      // updatePreview();
      
      return false; // Don't consume the event
   };
}

// Remove event handlers
function uninstallPolygonHandler() {
   if (!targetWindow) return;
   
   previewControl.onMousePress = null;
   previewControl.onMouseMove = null;
}

// Complete the current polygon and add it to exclusion areas
function finishPolygon() {
   if (activePolygon.length > 2) {
      // Close the polygon by connecting the last point to the first
      activePolygon.push(activePolygon[0]);
      // console.writeln("Closing polygon: " + activePolygon[0].x + ", " + activePolygon[0].y);
      // Add a copy of the active polygon to our exclusion areas
      exclusionAreaPolygons.push(activePolygon.slice());
      updateExclusionCount();
   }
   
   // Reset for next polygon
   activePolygon = [];
   isDrawing = false;
   uninstallPolygonHandler();
   updatePreview();
   
   dialog.startDrawing_Button.enabled = true;
   dialog.finishDrawing_Button.enabled = false;
   dialog.cancelDrawing_Button.enabled = false;
}

// Update the exclusion count label
function updateExclusionCount() {
   dialog.exclusionCount_Label.text = "Exclusion areas: " + exclusionAreaPolygons.length;
}

// Force a preview update
function updatePreview() {
   if (previewControl) {
      previewControl.update();
   }
}

function getScale(targetView) {
   var imgWidth = targetView.image.width;
   var imgHeight = targetView.image.height;
   
   // Set reasonable limits for the dialog size
   var maxPreviewWidth = Math.min(800, imgWidth);
   var maxPreviewHeight = Math.min(600, imgHeight);
   
   // Calculate scaling to fit within our max dimensions
   scale = Math.min(maxPreviewWidth / imgWidth, maxPreviewHeight / imgHeight);
}

// Set up preview for selected view
function setPreviewForView() {
   // Update the preview size to match image aspect ratio if the view changes
   if (targetView && previewControl) {
      var imgWidth = targetView.image.width;
      var imgHeight = targetView.image.height;
      
      // Set the preview size
      previewControl.setFixedSize(Math.round(imgWidth * scale), Math.round(imgHeight * scale));
      
      // Force dialog to adjust to the new control size
      dialog.adjustToContents();
   }
   
   updatePreview();
}

// Export mask image to be used with other processes
function exportExclusionMask(targetWindow, exclusionAreaPolygons) {
   targetView = targetWindow.mainView;
   
   if (exclusionAreaPolygons.length == 0) {
      // No exclusion areas defined
      return null;
   }
   
   var width = targetView.image.width;
   var height = targetView.image.height;
   
   // Create a new image
   var maskWindow = new ImageWindow(width, height, 1, 32, true, false, "ExclusionMask");
   var maskView = maskWindow.mainView;
   
   // Initialize to black (0)
   maskView.image.fill(0);
   
   // Draw exclusion polygons as white (1)
   // We could use the VectorGraphics class here, but for simplicity,
   // we'll just use the isPointInPolygon function to set each pixel
   maskView.beginProcess(UndoFlag_NoSwapFile);
   
   for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
         if (isPointExcluded(x, y)) {
            maskView.image.setSample(x, y, 0, 1); // Set to white (1)
         }
      }
   }
   
   maskView.endProcess();
   
   return maskWindow;
}

// Get exclusion areas.
// Exclusion area points are references to the preview image.
// To scale them to the current image size, we need to scale them
// using a function util.getScaledExclusionAreas.
function getExclusionAreas() {

   return { polygons: exclusionAreaPolygons, image_width: previewControl.width, image_height: previewControl.height };
}

// Scale current exclusion areas to match the image dimensions.
function scaleExclusionAreasToImage(currentExclusionAreas, targetWindow) {

   // Scale the exclusion areas to match the image dimensions
   var exclusionAreas = util.getScaledExclusionAreas(currentExclusionAreas, targetWindow);
   
   // Scale target image exclusion areas to the dialog image size
   var scaledExclusionAreaPolygons = [];
   for (var i = 0; i < exclusionAreas.polygons.length; i++) {
      var polygon = exclusionAreas.polygons[i];
      var scaledPolygon = [];
      for (var j = 0; j < polygon.length; j++) {
         // console.writeln("Scaling point: " + polygon[j].x + ", " + polygon[j].y);
         scaledPolygon.push({ x: Math.floor(polygon[j].x * scale), y: Math.floor(polygon[j].y * scale) });
      }
      scaledExclusionAreaPolygons.push(scaledPolygon);
   }

   return scaledExclusionAreaPolygons;
}

// Main script entry point
function main(activeWindow, currentExclusionAreas) {
   
   targetWindow = activeWindow;
   targetView = targetWindow.currentView;

   // Get the image scale and save it to use for scaling exclusion areas
   getScale(targetView);

   // Scale saved exclusions area points to current image size
   exclusionAreaPolygons = scaleExclusionAreasToImage(currentExclusionAreas, targetWindow);

   // Create and execute dialog
   dialog = new ExclusionAreaDialog();
   return dialog.execute();
}

this.main = main;
this.exportExclusionMask = exportExclusionMask;
this.getExclusionAreas = getExclusionAreas;

}  /* AutoIntegrateExclusionArea */

AutoIntegrateExclusionArea.prototype = new Object;

#endif  /* AUTOINTEGRATEEXCLUSIONAREA_JS */
