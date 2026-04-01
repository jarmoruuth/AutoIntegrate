// AutoIntegrateExclusionArea.js
// Script for drawing and managing user exclusion areas in PixInsight
// 
// This script allows the user to:
// 1. Draw polygonal exclusion areas on an image
// 2. Clear exclusion areas
// 3. Apply processing with exclusion regions

#ifndef AUTOINTEGRATEEXCLUSIONAREA_JS
#define AUTOINTEGRATEEXCLUSIONAREA_JS

class AutoIntegrateExclusionArea extends Dialog {

constructor(global, util, engine, activeWindow, currentExclusionAreas) {
   super();

   this.global = global;
   this.util = util;
   this.engine = engine;
   
   if (this.global.debug) console.writeln("AutoIntegrateExclusionArea constructor called.");

   // Global variables
   this.exclusionAreaPolygons = []; // Array of arrays, each containing points for a polygon
   this.activePolygon = []; // Current polygon being drawn
   this.isDrawing = false;
   this.targetView = null;
   this.targetWindow = null;
   this.previewControl = null;
   this.title = "AutoIntegrate Exclusion Area";
   this.scale = 1.0;

   this.targetWindow = activeWindow;
   this.targetView = this.targetWindow.currentView;

   // Get the image this.scale and save it to use for scaling exclusion areas
   this.getScale(this.targetView);

   // Scale saved exclusions area points to current image size
   this.exclusionAreaPolygons = this.scaleExclusionAreasToImage(currentExclusionAreas, this.targetWindow);

   this.labelWidth = this.font.width("Exclusion areas: 000") + 4;

   // Track mouse position
   this.lastMousePos = null;

   // UI components
   this.helpLabel = new Label(this);
   // this.helpLabel.text = "Click on the image to define polygon vertices. Double-click to close polygon.";
   this.helpLabel.text = "Click on the image to define polygon vertices.";
   this.helpLabel.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
   
   this.targetImage_Label = new Label(this);
   this.targetImage_Label.text = "Target image:";
   this.targetImage_Label.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
   this.targetImage_Label.minWidth = this.labelWidth;
   
   this.targetImage_Info = new Label(this);
  
   if (this.targetView && this.targetWindow) {
      this.targetImage_Info.text = this.targetWindow.mainView.id;
      this.setPreviewForView();
   } else {
      this.targetImage_Info.text = "No active image";
   }
   
   this.startDrawing_Button = new PushButton(this);
   this.startDrawing_Button = this.startDrawing_Button;
   this.startDrawing_Button.text = "Start Drawing";
   this.startDrawing_Button.icon = this.scaledResource(":/icons/window-new.png");
   this.startDrawing_Button.onClick = () => {
      if (!this.targetView) {
         (new MessageBox("No active image. Please open an image first.", this.title, StdIcon.Error)).execute();
         return;
      }
      
      this.activePolygon = [];
      this.lastMousePos = null;
      this.isDrawing = true;
      
      // Enable real-time preview to show drawing
      this.installPolygonHandler();
      
      this.startDrawing_Button.enabled = false;
      this.finishDrawing_Button.enabled = true;
      this.cancelDrawing_Button.enabled = true;
   };
   
   this.finishDrawing_Button = new PushButton(this);
   this.finishDrawing_Button = this.finishDrawing_Button;
   this.finishDrawing_Button.text = "Finish Current Polygon";
   this.finishDrawing_Button.icon = this.scaledResource(":/icons/ok.png");
   this.finishDrawing_Button.enabled = false;
   this.finishDrawing_Button.onClick = () => {
      this.finishPolygon();
   };
   
   this.cancelDrawing_Button = new PushButton(this);
   this.cancelDrawing_Button = this.cancelDrawing_Button;
   this.cancelDrawing_Button.text = "Cancel Drawing";
   this.cancelDrawing_Button.icon = this.scaledResource(":/icons/cancel.png");
   this.cancelDrawing_Button.enabled = false;
   this.cancelDrawing_Button.onClick = () => {
      this.activePolygon = [];
      this.isDrawing = false;
      this.uninstallPolygonHandler();
      this.updatePreview();
      
      this.startDrawing_Button.enabled = true;
      this.finishDrawing_Button.enabled = false;
      this.cancelDrawing_Button.enabled = false;
   };

   this.exclusionCount_Label = new Label(this);
   this.exclusionCount_Label.text = "Exclusion areas: " + this.exclusionAreaPolygons.length;
   this.exclusionCount_Label.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
   
   this.preview_Control = new Control(this);
   
   // Make the preview match the image dimensions
   // Calculate a suitable preview size that maintains aspect ratio
   this.imgWidth = this.targetView.image.width;
   this.imgHeight = this.targetView.image.height;
   
   // Set the preview size
   this.preview_Control.setMinSize(Math.round(this.imgWidth * this.scale), Math.round(this.imgHeight * this.scale));
   
   this.preview_Control.backgroundcolor = 0xFF000000;
   this.preview_Control.toolTip = "Preview of exclusion areas";
   this.preview_Control.onPaint = () => {
      this.drawPreview(this.preview_Control);
   };
   this.previewControl = this.preview_Control;
   
   this.clearAll_Button = new PushButton(this);
   this.clearAll_Button.text = "Clear All Areas";
   this.clearAll_Button.icon = this.scaledResource(":/icons/delete.png");
   this.clearAll_Button.onClick = () => {
      if (this.exclusionAreaPolygons.length > 0) {
         if ((new MessageBox("Do you really want to delete all exclusion areas?",
               this.title, StdIcon.Warning, StdButton.Yes, StdButton.No)).execute() == StdButton.Yes) {
            this.exclusionAreaPolygons = [];
            this.updateExclusionCount();
            this.updatePreview();
         }
      }
   };
   
   this.dialog_ok_Button = new PushButton(this);
   this.dialog_ok_Button.text = "OK";
   this.dialog_ok_Button.icon = this.scaledResource(":/icons/ok.png");
   this.dialog_ok_Button.onClick = () => {
      this.ok();
   };
   this.dialog_cancel_Button = new PushButton(this);
   this.dialog_cancel_Button.text = "Cancel";
   this.dialog_cancel_Button.icon = this.scaledResource(":/icons/cancel.png");
   this.dialog_cancel_Button.onClick = () => {
      this.cancel();
   };
   
   // Dialog layout
   this.sizer = new VerticalSizer;
   this.sizer.margin = 8;
   this.sizer.spacing = 6;
   
   // Help text
   this.sizer.add(this.helpLabel);
   this.sizer.addSpacing(4);
   
   // Target selection
   this.targetSizer = new HorizontalSizer;
   this.targetSizer.spacing = 4;
   this.targetSizer.add(this.targetImage_Label);
   this.targetSizer.add(this.targetImage_Info, 100);
   this.sizer.add(this.targetSizer);
   this.sizer.addSpacing(8);
   
   // Drawing controls
   this.drawingSizer = new HorizontalSizer;
   this.drawingSizer.spacing = 4;
   this.drawingSizer.add(this.startDrawing_Button);
   this.drawingSizer.add(this.finishDrawing_Button);
   this.drawingSizer.add(this.cancelDrawing_Button);
   this.drawingSizer.addStretch();
   this.drawingSizer.add(this.exclusionCount_Label);
   this.sizer.add(this.drawingSizer);
   this.sizer.addSpacing(4);
   
   // Preview
   this.previewSizer = new HorizontalSizer;
   this.previewSizer.add(this.preview_Control, 100);
   this.sizer.add(this.previewSizer, 100);
   this.sizer.addSpacing(4);
   
   // Area management
   this.managementSizer = new HorizontalSizer;
   this.managementSizer.spacing = 4;
   this.managementSizer.add(this.clearAll_Button);
   this.managementSizer.addStretch();
   this.managementSizer.add(this.dialog_ok_Button);
   this.managementSizer.add(this.dialog_cancel_Button);
   this.sizer.add(this.managementSizer);
   
   this.windowTitle = this.title;
   this.ensureLayoutUpdated();
   this.adjustToContents();
} // constructor

// Helper to draw the preview
drawPreview(control) {
   if (!this.targetView) return;

   // console.writeln("Drawing preview...");

   var bitmap = this.targetView.image.render().scaledTo(control.width, control.height);
   
   var g = new Graphics(bitmap);
   
   var offsetX = control.width  / 2;
   var offsetY = control.height  / 2;
   
   // Draw existing exclusion areas
   g.pen = new Pen(0xFFFF6600, 1);
   
   for (var i = 0; i < this.exclusionAreaPolygons.length; i++) {
      var polygon = this.exclusionAreaPolygons[i];
      if (polygon.length > 0) {
         for (var j = 1; j < polygon.length; j++) {
            // console.writeln("Drawing line: " + polygon[j-1].x + ", " + polygon[j-1].y + " to " + polygon[j].x + ", " + polygon[j].y);
            g.drawLine(polygon[j-1].x, polygon[j-1].y, polygon[j].x, polygon[j].y);
         }
      }
   }
   
   // Draw the active polygon being created
   if (this.activePolygon.length > 0) {
      g.pen = new Pen(0xFFFFFF00, 1);
      
      for (var j = 1; j < this.activePolygon.length; j++) {
         // console.writeln("Drawing active line: " + this.activePolygon[j-1].x + ", " + this.activePolygon[j-1].y + " to " + this.activePolygon[j].x + ", " + this.activePolygon[j].y);
         g.drawLine(this.activePolygon[j-1].x, this.activePolygon[j-1].y, this.activePolygon[j].x, this.activePolygon[j].y);
      }
      
      // Draw a line to the current mouse position if we're drawing
      if (0 && this.isDrawing && this.lastMousePos) {
         let last = this.activePolygon[this.activePolygon.length - 1];
         let mousePos = this.lastMousePos;
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

// Setup mouse event handlers for drawing
installPolygonHandler() {
   if (!this.targetWindow) return;
   
   // Mouse press handler - add points to the active polygon
   this.previewControl.onMousePress = (x, y, button, buttons, modifiers) => {
      // console.writeln("Mouse Press: " + x + ", " + y);
      if (!this.isDrawing) return false;
      // if (button != MouseButton_Left) return false;
      
      if (0) {
         // Double click closes the polygon
         var now = Date.now();
         if (this.targetWindow.lastClickTime && now - this.targetWindow.lastClickTime < 300 && this.activePolygon.length > 2) {
            this.finishPolygon();
            return true;
         }
         this.targetWindow.lastClickTime = now;
      }
      // Check if the point is already in the polygon
      for (var i = 0; i < this.activePolygon.length; i++) {
         if (this.activePolygon[i].x == x && this.activePolygon[i].y == y) {
            // console.writeln("Point already in polygon: " + x + ", " + y);
            return false; // Ignore duplicate points
         }
      }      
      // Add point to active polygon
      this.activePolygon.push({ x: x, y: y });
      this.updatePreview();
      
      return true;
   };
   
   // Mouse move handler - track mouse position for live preview
   this.previewControl.onMouseMove = (x, y, buttons, modifiers) => {
      if (!this.isDrawing) return false;
      
      // console.writeln("Mouse Pos: " + x + ", " + y);
      // this.lastMousePos = { x: x, y: y };
      // updatePreview();
      
      return false; // Don't consume the event
   };
}

// Remove event handlers
uninstallPolygonHandler() {
   if (!this.targetWindow) return;
   
   this.previewControl.onMousePress = null;
   this.previewControl.onMouseMove = null;
}

// Complete the current polygon and add it to exclusion areas
finishPolygon() {
   if (this.activePolygon.length > 2) {
      // Close the polygon by connecting the last point to the first
      this.activePolygon.push(this.activePolygon[0]);
      // console.writeln("Closing polygon: " + this.activePolygon[0].x + ", " + this.activePolygon[0].y);
      // Add a copy of the active polygon to our exclusion areas
      this.exclusionAreaPolygons.push(this.activePolygon.slice());
      this.updateExclusionCount();
   }
   
   // Reset for next polygon
   this.activePolygon = [];
   this.isDrawing = false;
   this.uninstallPolygonHandler();
   this.updatePreview();
   
   this.startDrawing_Button.enabled = true;
   this.finishDrawing_Button.enabled = false;
   this.cancelDrawing_Button.enabled = false;
}

// Update the exclusion count label
updateExclusionCount() {
   this.exclusionCount_Label.text = "Exclusion areas: " + this.exclusionAreaPolygons.length;
}

// Force a preview update
updatePreview() {
   if (this.previewControl) {
      this.previewControl.update();
   }
}

getScale(targetView) {
   var imgWidth = targetView.image.width;
   var imgHeight = targetView.image.height;
   
   // Set reasonable limits for the dialog size
   var maxPreviewWidth = Math.min(800, imgWidth);
   var maxPreviewHeight = Math.min(600, imgHeight);
   
   // Calculate scaling to fit within our max dimensions
   this.scale = Math.min(maxPreviewWidth / imgWidth, maxPreviewHeight / imgHeight);
}

// Set up preview for selected view
setPreviewForView() {
   // Update the preview size to match image aspect ratio if the view changes
   if (this.targetView && this.previewControl) {
      var imgWidth = this.targetView.image.width;
      var imgHeight = this.targetView.image.height;
      
      // Set the preview size
      this.previewControl.setFixedSize(Math.round(imgWidth * this.scale), Math.round(imgHeight * this.scale));
      
      // Force dialog to adjust to the new control size
      this.ensureLayoutUpdated();
      this.adjustToContents();
   }
   
   this.updatePreview();
}

// Export mask image to be used with other processes
exportExclusionMask(targetWindow, exclusionAreaPolygons) {
   this.targetView = targetWindow.mainView;
   
   if (exclusionAreaPolygons.length == 0) {
      // No exclusion areas defined
      return null;
   }
   
   var width = this.targetView.image.width;
   var height = this.targetView.image.height;
   
   // Create a new image
   var maskWindow = new ImageWindow(width, height, 1, 32, true, false, "ExclusionMask");
   var maskView = maskWindow.mainView;
   
   // Initialize to black (0)
   maskView.image.fill(0);
   
   // Draw exclusion polygons as white (1)
   // We could use the Graphics class here, but for simplicity,
   // we'll just use the isPointInPolygon to set each pixel
   maskView.beginProcess(UndoFlag.NoSwapFile);
   
   for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
         if (this.engine.isPointExcluded(x, y)) {
            maskView.image.setSample(x, y, 0, 1); // Set to white (1)
         }
      }
   }
   
   maskView.endProcess();
   
   return maskWindow;
}

// Get exclusion areas.
// Exclusion area points are references to the preview image.
// To this.scale them to the current image size, we need to this.scale them
// using a this.util.getScaledExclusionAreas.
getExclusionAreas() {

   return { polygons: this.exclusionAreaPolygons, image_width: this.previewControl.width, image_height: this.previewControl.height };
}

// Scale current exclusion areas to match the image dimensions.
scaleExclusionAreasToImage(currentExclusionAreas, targetWindow) {

   if (this.global.debug) console.writeln("Scaling exclusion areas to image dimensions", JSON.stringify(currentExclusionAreas));

   // Scale the exclusion areas to match the image dimensions
   var exclusionAreas = this.util.getScaledExclusionAreas(currentExclusionAreas, targetWindow);
   
   // Scale target image exclusion areas to the dialog image size
   var scaledExclusionAreaPolygons = [];
   for (var i = 0; i < exclusionAreas.polygons.length; i++) {
      var polygon = exclusionAreas.polygons[i];
      var scaledPolygon = [];
      for (var j = 0; j < polygon.length; j++) {
         // console.writeln("Scaling point: " + polygon[j].x + ", " + polygon[j].y);
         scaledPolygon.push({ x: Math.floor(polygon[j].x * this.scale), y: Math.floor(polygon[j].y * this.scale) });
      }
      scaledExclusionAreaPolygons.push(scaledPolygon);
   }

   return scaledExclusionAreaPolygons;
}

/*
this.getExclusionAreas = getExclusionAreas;
*/

} // AutoIntegrateExclusionArea class end

#endif  /* AUTOINTEGRATEEXCLUSIONAREA_JS */
