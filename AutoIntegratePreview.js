// Interface function
//
// SetImage = function(image, txt)
// UpdateImage = function(image, txt)
// showClippedImage = () =>
// forceRedraw = () =>
// setSize = function(w, h)

#ifndef AUTOINTEGRATEPREVIEW_JS
#define AUTOINTEGRATEPREVIEW_JS

/***************************************************************************
 * 
 *    AutoIntegrateMaxPreviewDialog
 * 
 * Show image preview in max size view.
 * 
 */
class AutoIntegrateMaxPreviewDialog extends Dialog
{

constructor(engine, util, global, image, txt) {
      super();
      this.restyle();

      let sz = util.getScreenSize(this);

      var screen_width = sz[0];
      var screen_height = sz[1];

       var preview_width = Math.floor(screen_width - 50);
       var preview_height = Math.floor(screen_height - 50);

       console.writeln("Maximize image preview: screen_width ", screen_width, ", screen_height ", screen_height + ", preview_width ", preview_width, ", preview_height ", preview_height);

      this.maxPreviewControl = new AutoIntegratePreviewControl(this, "max", engine, util, global, preview_width, preview_height, true);

      this.maxPreviewControl.SetImage(image, txt);
   
      this.sizer = new VerticalSizer;
      this.sizer.margin = 6;
      this.sizer.spacing = 4;
      this.sizer.add( this.maxPreviewControl );

      // adjust to ensure that we fit on screen
      util.adjustDialogToScreen(this, this.maxPreviewControl, true, preview_width, preview_height);

      this.move(5, 5);      // move to top left corner
   
      this.windowTitle = "Max preview";
      util.updateLayout(this);
      this.setFixedSize();
} // end of constructor

}

/***************************************************************************
 * 
 *    AutoIntegratePreviewControl
 * 
 * Slightly modified by Jarmo Ruuth for AutoIntegrate script.
 * 
 * Copyright (C) 2013, Andres del Pozo
 * 
 * This product is based on software from the PixInsight project, developed
 * by Pleiades Astrophoto and its contributors (https://pixinsight.com/).
 */
class AutoIntegratePreviewControl extends Frame
{
      constructor(parentDialog, name, engine, util, global, size_x, size_y, call_from_max_preview) {
            super(parentDialog);

            this.parentDialog = parentDialog;
            this.name = name;
            this.engine = engine;
            this.util = util;
            this.global = global;

            this.size_x = size_x;
            this.size_y = size_y;

            this.call_from_max_preview = call_from_max_preview;

            this.par = this.global.par;

            if (this.call_from_max_preview) {
                  this.normalPreview = false;
            } else {   
                  this.normalPreview = true;
            }
#ifdef AUTOINTEGRATE_STANDALONE
            this.standalone = true;
#else
            this.standalone = false;
#endif

            this.bitmap = null;
            this.scaledBitmap = null;
            this.saveNonclippedBitmap = null;

            this.initGUI();

      } // constructor

       // Set image window and bitmap
       // With fit_without_zoom_in an image that fits into the preview is shown 1:1
       // and not zoomed in to fill the preview. It is used for example with the
       // flowchart image that is drawn to the preview size.
       SetImage(image, txt, fit_without_zoom_in = false)
       {
             if (!this.global.interactiveMode) {
                  return;
             }
             if (this.par.debug.val) console.writeln(this.name + ":SetImage:image " + image.width + "x" + image.height + ", txt " + txt);

             this.SetImageBitmap(image.render(), txt, fit_without_zoom_in);
      }

      SetImageBitmap(bitmap, txt, fit_without_zoom_in = false)
      {
             if (this.par.debug.val) console.writeln(this.name + ":SetImageBitmap:bitmap " + bitmap.width + "x" + bitmap.height + ", txt " + txt);
             if (this.bitmap != null) {
                  this.bitmap.clear();
             }
             this.bitmap = bitmap;
             this.fitWithoutZoomIn = fit_without_zoom_in;
             if (this.scaledBitmap != null) {
                  this.scaledBitmap.clear();
                  this.scaledBitmap = null;
             }
             this.SetZoomOutLimit();
             this.UpdateZoom(-100);
             if (txt) {
                  this.image_name_Label.text = txt;
            } else {
                  this.image_name_Label.text = "";
            }
            if (this.saveNonclippedBitmap != null) {
                  this.saveNonclippedBitmap.clear();
                  this.saveNonclippedBitmap = null;
            }
      }

       // Update image window and bitmap
       UpdateImage(image, txt, fit_without_zoom_in = false)
       {
             if (!this.global.interactiveMode) {
                  return;
             }
             if (this.par.debug.val) console.writeln(this.name + ":UpdateImage:image " + image.width + "x" + image.height + ", txt " + txt);
             this.UpdateImageBitmap(image.render(), txt, fit_without_zoom_in)
       }

       UpdateImageBitmap(bitmap, txt, fit_without_zoom_in = false)
       {
             if (this.par.debug.val) console.writeln(this.name + ":UpdateImageBitmap:bitmap " + bitmap.width + "x" + bitmap.height + ", txt " + txt);
             if (this.zoom == this.zoomOutLimit) {
                   this.SetImageBitmap(bitmap, txt, fit_without_zoom_in);
             } else {
                  if (this.bitmap != null) {
                        this.bitmap.clear();
                  }
                   this.bitmap = bitmap;
                   this.fitWithoutZoomIn = fit_without_zoom_in;
                   if (this.scaledBitmap != null) {
                        this.scaledBitmap.clear();
                        this.scaledBitmap = null;
                   }
                   if (this.zoom == this.zoomOutLimit) {
                        var newZoom = -100;
                   } else {
                        var newZoom = this.zoom;
                   }
                   this.SetZoomOutLimit();
                   this.UpdateZoom(newZoom);
                   if (txt) {
                        this.image_name_Label.text = txt;
                  } else {
                        this.image_name_Label.text = "";
                  }
                  if (this.saveNonclippedBitmap != null) {
                        this.saveNonclippedBitmap.clear();
                        this.saveNonclippedBitmap = null;
                  }
            }
       }

       showClippedImage()
       {
            if (!this.global.interactiveMode) {
                  return;
            }
            if (this.saveNonclippedBitmap) {
                  console.writeln("showNonclippedImage");
                  this.UpdateImageBitmap(this.saveNonclippedBitmap, this.image_name_Label.text);
                  return;
            }

            console.writeln("showClippedImage");

            var imgWin = this.util.findWindow("AutoIntegrate_preview_clipped");
            if (imgWin) {
                  imgWin.forceClose();
            }

            // Create a new window from the image
            imgWin = this.util.createWindowFromBitmap(this.bitmap, "AutoIntegrate_preview_clipped");

            // Show clipped pixels using PixelMath
            var P = new PixelMath;
            P.expression = "iif( $T <= 0, 0, iif( $T >= 1, 1, 0.5 ) )";
            P.expression1 = "";
            P.expression2 = "";
            P.expression3 = "";
            P.useSingleExpression = true;
            P.symbols = "";
            P.clearImageCacheAndExit = false;
            P.cacheGeneratedImages = false;
            P.generateOutput = true;
            P.singleThreaded = false;
            P.optimization = true;
            P.use64BitWorkingImage = false;
            P.rescale = false;
            P.rescaleLower = 0;
            P.rescaleUpper = 1;
            P.truncate = true;
            P.truncateLower = 0;
            P.truncateUpper = 1;
            P.createNewImage = false;
            P.showNewImage = false;
            P.newImageId = "";
            P.newImageWidth = 0;
            P.newImageHeight = 0;
            P.newImageAlpha = false;
            P.newImageColorSpace = PixelMath.SameAsTarget;
            P.newImageSampleFormat = PixelMath.SameAsTarget;
            /*
             * Read-only properties
             *
            P.outputData = [ // globalVariableId, globalVariableRK, globalVariableG, globalVariableB
            ];
             */

            P.executeOn(imgWin.mainView, false);

            // Save the original non-clipped image
            var saveNonclippedBitmap = this.bitmap;
            this.bitmap = null;

            this.UpdateImageBitmap(imgWin.mainView.image.render(), this.image_name_Label.text);

            imgWin.forceClose();

            this.saveNonclippedBitmap = saveNonclippedBitmap;
       }
 
       UpdateZoom(newZoom, refPoint)
       {
            if (!this.bitmap) {
                  return;
            }
            if (newZoom > this.zoomInLimit) {
                   newZoom = this.zoomInLimit;
             }
            if (newZoom < this.zoomOutLimit) {
                   newZoom = this.zoomOutLimit;
             }
             if (this.par.debug.val) console.writeln(this.name + ":UpdateZoom:newZoom " + newZoom);
             if (newZoom == this.zoom && this.scaledBitmap) {
                   return;
             }
 
             if(refPoint==null) {
                   refPoint=new Point(this.scrollbox.viewport.width/2, this.scrollbox.viewport.height/2);
             }
             var imgx=null;
             if(this.scrollbox.maxHorizontalScrollPosition>0 || this.zoom == this.zoomOutLimit) {
                   imgx=(refPoint.x+this.scrollbox.horizontalScrollPosition)/this.scale;
             }
             // imgx and imgy are in this.bitmap coordinates (i.e. 1:1 scale)
             var imgy=null;
             if(this.scrollbox.maxVerticalScrollPosition>0 || this.zoom == this.zoomOutLimit) {
                   imgy=(refPoint.y+this.scrollbox.verticalScrollPosition)/this.scale;
             }
 
             this.zoom = newZoom;
             this.scale = this.zoom;
             if (this.scaledBitmap != null) {
                  this.scaledBitmap.clear();
                  this.scaledBitmap = null;
             }
            if (this.zoom >= 1) {
                  this.zoomVal_Label.text = (Math.round(this.zoom * 10) / 10).toString() + ":1";
            } else {
                  this.zoomVal_Label.text = format("1:%d", Math.ceil(1 / this.zoom));
            }
            if (this.bitmap) {
                   if (this.zoom > 1) {
                        // Zoom in above 1:1 would create a very large bitmap, so only
                        // the size is stored and the visible part is drawn in onPaint.
                        if (this.par.debug.val) console.writeln(this.name + ":UpdateZoom:zoom in scale " + this.scale);
                        this.scaledBitmap = { width: Math.round(this.bitmap.width * this.scale),
                                              height: Math.round(this.bitmap.height * this.scale),
                                              zoomedIn: true,
                                              clear: function() {} };
                   } else if (this.zoom > this.zoomOutLimit) {
                        if (this.par.debug.val) console.writeln(this.name + ":UpdateZoom:scale " + this.scale);
                        this.scaledBitmap = this.bitmap.scaled(this.scale);
                   } else if (this.fitWithoutZoomIn && this.scale == 1) {
                        // Show 1:1 without scaling so for example text stays sharp
                        if (this.par.debug.val) console.writeln(this.name + ":UpdateZoom:fit without zoom in, scale 1");
                        this.scaledBitmap = this.bitmap.scaled(1);
                   } else {
                        if (this.par.debug.val) console.writeln(this.name + ":UpdateZoom:0.98 * scale " + (0.98 * this.scale));
                        this.scaledBitmap = this.bitmap.scaled(0.98 * this.scale);
                   }
             } else {
                   this.scaledBitmap = {width:this.bitmap.width * this.scale, height:this.bitmap.height * this.scale};
             }
             this.scrollbox.maxHorizontalScrollPosition = Math.max(0, this.scaledBitmap.width - this.scrollbox.viewport.width);
             this.scrollbox.maxVerticalScrollPosition = Math.max(0, this.scaledBitmap.height - this.scrollbox.viewport.height);
 
             if(this.scrollbox.maxHorizontalScrollPosition>0 && imgx!=null) {
                   this.scrollbox.horizontalScrollPosition = (imgx*this.scale)-refPoint.x;
             }
             if(this.scrollbox.maxVerticalScrollPosition>0 && imgy!=null) {
                   this.scrollbox.verticalScrollPosition = (imgy*this.scale)-refPoint.y;
             }
 
             this.scrollbox.viewport.update();
       }

       // Zoom steps are fractions of the fit size below 1:1 and whole numbers above 1:1
       ZoomIn(refPoint)
       {
            if (this.zoom >= 1) {
                  var newZoom = Math.floor(this.zoom) + 1;
            } else {
                  var newZoom = Math.min(1, this.zoom + this.zoomOutLimit);
            }
            this.UpdateZoom(newZoom, refPoint);
       }

       ZoomOut(refPoint)
       {
            if (this.zoom > 1) {
                  var newZoom = Math.ceil(this.zoom) - 1;
            } else {
                  var newZoom = this.zoom - this.zoomOutLimit;
            }
            this.UpdateZoom(newZoom, refPoint);
       }

       initGUI()
       {
 
      this.zoomIn_Button = new ToolButton( this );
      this.zoomIn_Button.icon = this.scaledResource( ":/icons/zoom-in.png" );
      this.zoomIn_Button.setScaledFixedSize( 20, 20 );
      this.zoomIn_Button.toolTip = "Zoom in";
      this.zoomIn_Button.onClick = () =>
      {
            if (this.par.debug.val) console.writeln(this.name + ":zoom-in");
            this.ZoomIn();
      };

      this.zoomOut_Button = new ToolButton( this );
      this.zoomOut_Button.icon = this.scaledResource( ":/icons/zoom-out.png" );
      this.zoomOut_Button.setScaledFixedSize( 20, 20 );
      this.zoomOut_Button.toolTip = "Zoom out";
      this.zoomOut_Button.onClick = () =>
      {
            if (this.par.debug.val) console.writeln(this.name + ":zoom-out");
            this.ZoomOut();
      };

      this.zoom11_Button = new ToolButton( this );
      this.zoom11_Button.icon = this.scaledResource( ":/icons/zoom-1-1.png" );
      this.zoom11_Button.setScaledFixedSize( 20, 20 );
      this.zoom11_Button.toolTip = "Zoom 1:1";
      this.zoom11_Button.onClick = () =>
      {
            if (this.par.debug.val) console.writeln(this.name + ":zoom-1-1");
            this.UpdateZoom(1);
      };

      this.zoomFit_Button = new ToolButton( this );
      this.zoomFit_Button.icon = this.scaledResource( ":/icons/zoom.png" );
      this.zoomFit_Button.setScaledFixedSize( 20, 20 );
      this.zoomFit_Button.toolTip = "Zoom fit";
      this.zoomFit_Button.onClick = () =>
      {
            if (this.par.debug.val) console.writeln(this.name + ":zoom");
            this.UpdateZoom(-100);
      };

      if (this.normalPreview) {
            this.save_Button = new ToolButton( this );
            this.save_Button.icon = this.scaledResource( ":/icons/save-as.png" );
            this.save_Button.setScaledFixedSize( 20, 20 );
            this.save_Button.toolTip = "Save image to a file.";
            this.save_Button.onClick = () =>
            {
                  if (!this.bitmap) {
                        console.noteln("No image to save");
                        return;
                  }
                  let saveFileDialog = new SaveFileDialog();
                  saveFileDialog.caption = "Save As TIFF";
                  if (this.global.outputRootDir == "") {
                        var path = this.global.ppar.lastDir;
                  } else {
                        var path = this.global.outputRootDir;
                  }
                  if (path != "") {
                        path = this.util.ensurePathEndSlash(path);
                  }
                  saveFileDialog.initialPath = path + "preview" + ".tif";
                  saveFileDialog.filters = [["TIFF files", "*.tif"], ["JPEG files", "*.jpg"]];
                  if (!saveFileDialog.execute()) {
                        console.noteln("Preview image not saved");
                        return;
                  }
                  var copy_win = this.util.createWindowFromBitmap(this.bitmap, "AutoIntegrate_preview_savetmp");
                  console.writeln("save image to ", saveFileDialog.filePath + ", bits ", copy_win.bitsPerSample + ", width ", copy_win.mainView.image.width + ", height ", copy_win.mainView.image.height + ", id ", copy_win.mainView.id);
                  if (copy_win.bitsPerSample != 16) {
                        console.writeln("set bits to 16");
                        copy_win.setSampleFormat(16, false);
                  }
                  // Save image. No format options, no warning messages, 
                  // no strict mode, no overwrite checks.
                  if (!copy_win.saveAs(saveFileDialog.filePath, false, false, false, false)) {
                        console.criticalln("Failed to save image: " + saveFileDialog.filePath);
                  } else {
                        console.writeln("Saved image: " + saveFileDialog.filePath);
                  }
                  this.util.closeOneWindow(copy_win);
            };
      }
      if (this.normalPreview) {
            this.maxPreview_Button = new ToolButton( this );
            this.maxPreview_Button.icon = this.scaledResource( ":/real-time-preview/full-view.png" );
            this.maxPreview_Button.setScaledFixedSize( 20, 20 );
            this.maxPreview_Button.toolTip = "Open a new dialog to view the image in (almost) full screen size.";
            this.maxPreview_Button.onClick = () =>
            {
                  let image = this.util.createImageFromBitmap(this.bitmap);
                  let maxPreviewDialog = new AutoIntegrateMaxPreviewDialog(this.engine, this.util, this.global, image, this.image_name_Label.text);
                  maxPreviewDialog.execute();
                  image.free();
            };
      }
      this.image_name_Label = new Label( this );
      this.image_name_Label.text = "";
      this.image_name_Label.textAlignment = TextAlignment.Right | TextAlignment.VertCenter;

      this.buttons_Sizer = new HorizontalSizer;
      this.buttons_Sizer.add( this.zoomIn_Button );
      this.buttons_Sizer.add( this.zoomOut_Button );
      this.buttons_Sizer.add( this.zoom11_Button );
      this.buttons_Sizer.add( this.zoomFit_Button );
      if (this.normalPreview) {
            this.buttons_Sizer.addSpacing( 12 );
            this.buttons_Sizer.add( this.maxPreview_Button );
      }
      if (this.normalPreview) {
            this.buttons_Sizer.addSpacing( 24 );
            this.buttons_Sizer.add( this.save_Button );
      }
      this.buttons_Sizer.addStretch();
      this.buttons_Sizer.addSpacing( 12 );
      this.buttons_Sizer.add( this.image_name_Label );

       this.zoom = 1;
       this.scale = 1;
       this.zoomOutLimit = -100;
       this.zoomInLimit = 8;          // max zoom 8:1
       this.fitWithoutZoomIn = false; // show an image that fits into the preview 1:1
       this.drag = null;              // mouse drag start position when moving the image
       this.scrollbox = new ScrollBox(this);
       this.scrollbox.autoScroll = true;
       this.scrollbox.tracking = true;
       this.scrollbox.cursor = new Cursor(StdCursor.Arrow);
 
       this.scroll_Sizer = new HorizontalSizer;
       this.scroll_Sizer.add( this.scrollbox );

       this.scrollbox.onHorizontalScrollPosUpdated = function (newPos)
       {
             this.viewport.update();
       }
       this.scrollbox.onVerticalScrollPosUpdated = function (newPos)
       {
             this.viewport.update();
       }
 
      this.scrollbox.viewport.onMouseWheel = function (x, y, delta, buttonState, modifiers)
       {
             var preview = this.parent.parent;
             if (delta > 0) {
                   preview.ZoomIn(new Point(x,y));
             } else {
                   preview.ZoomOut(new Point(x,y));
             }
       }
 
       this.scrollbox.viewport.onClick = function ( x, y, button, buttonState, modifiers )
       {
             var preview = this.parent.parent;
             var p =  preview.transform(x, y, preview);
             if(preview.onCustomMouseDown)
             {
                   preview.onCustomMouseDown.call(this, p.x, p.y, button, buttonState, modifiers )
             }
       }
 
       // Drag the image with the left mouse button when it is larger than the view
       this.scrollbox.viewport.onMousePress = function ( x, y, button, buttonState, modifiers )
       {
             var preview = this.parent.parent;
             var scrollbox = preview.scrollbox;
             if (button == MouseButton.Left && (scrollbox.maxHorizontalScrollPosition > 0 || scrollbox.maxVerticalScrollPosition > 0)) {
                   preview.drag = { x: x, y: y,
                                    h: scrollbox.horizontalScrollPosition, v: scrollbox.verticalScrollPosition,
                                    moved: false };
                   this.cursor = new Cursor(StdCursor.ClosedHand);
             }
             if (preview.bitmap) {
                   preview.updateCoordinates(preview.transform(x, y, preview));
             }
       }

       this.scrollbox.viewport.onMouseMove = function ( x, y, buttonState, modifiers )
       {
             var preview = this.parent.parent;

             if (preview.drag != null) {
                   if (Math.abs(x - preview.drag.x) > 2 || Math.abs(y - preview.drag.y) > 2) {
                         preview.drag.moved = true;
                   }
                   if (preview.drag.moved) {
                         var scrollbox = preview.scrollbox;
                         scrollbox.horizontalScrollPosition = Math.max(0, Math.min(scrollbox.maxHorizontalScrollPosition, preview.drag.h - (x - preview.drag.x)));
                         scrollbox.verticalScrollPosition = Math.max(0, Math.min(scrollbox.maxVerticalScrollPosition, preview.drag.v - (y - preview.drag.y)));
                   }
             }

             if (!preview.bitmap) {
                  return;
             }
             var p =  preview.transform(x, y, preview);

             preview.updateCoordinates(p);

             if(preview.onCustomMouseMove)
             {
                   preview.onCustomMouseMove.call(this, p.x, p.y, buttonState, modifiers )
             }
       }
 
       this.scrollbox.viewport.onMouseRelease = function (x, y, button, buttonState, modifiers)
       {
             var preview = this.parent.parent;
 
             var p =  preview.transform(x, y, preview);

             var dragged = preview.drag != null && preview.drag.moved;
             if (preview.drag != null) {
                   preview.drag = null;
                   this.cursor = new Cursor(StdCursor.Arrow);
             }

             if (preview.zoom >= 1 && preview.coordinatesEdit && !dragged) {
                  preview.coordinatesEdit.text = Math.floor(p.x).toString() + "," + Math.floor(p.y).toString();
             }

             if(preview.onCustomMouseUp)
             {
                   preview.onCustomMouseUp.call(this, p.x, p.y, button, buttonState, modifiers )
             }
       }
 
       this.scrollbox.viewport.onResize = function (wNew, hNew, wOld, hOld)
       {
            var preview = this.parent.parent;
            if (preview.par.debug.val) console.writeln(preview.name + ":onResize");
            if(preview.image && preview.scaledBitmap != null)
             {
                   this.parent.maxHorizontalScrollPosition = Math.max(0, preview.scaledBitmap.width - wNew);
                   this.parent.maxVerticalScrollPosition = Math.max(0, preview.scaledBitmap.height - hNew);
                   if (preview.par.debug.val) console.writeln(preview.name + ":onResize, preview.zoom " + preview.zoom + ", preview.zoomOutLimit " + preview.zoomOutLimit);
                   if (preview.zoom == preview.zoomOutLimit) {
                        var newZoom = -100;
                   } else {
                        var newZoom = preview.zoom;
                   }
                   preview.SetZoomOutLimit();
                   preview.UpdateZoom(newZoom);
             }
             this.update();
       }
 
       this.scrollbox.viewport.onPaint = function (x0, y0, x1, y1)
       {
            var preview = this.parent.parent;
            if (preview.par.debug.val) console.writeln(preview.name + ":onPaint");
             var graphics = new Graphics(this); // VectorGraphics
             if (preview.global.ppar.preview.black_background) {
                  var background_color = 0xff000000; // black
                  var border_color = 0xff000000;     // black
             } else {
                  var background_color = 0xff202020; // very dark grey
                  var border_color = 0xffffffff;     // white
             }

             graphics.fillRect(x0,y0, x1, y1, new Brush(background_color));
             if (preview.scaledBitmap != null) {
                   var offsetX = this.parent.maxHorizontalScrollPosition>0 ? -this.parent.horizontalScrollPosition : (this.width-preview.scaledBitmap.width)/2;
                   var offsetY = this.parent.maxVerticalScrollPosition>0 ? -this.parent.verticalScrollPosition: (this.height-preview.scaledBitmap.height)/2;
                   graphics.translateTransformation(offsetX, offsetY);
                   if (preview.bitmap && preview.scaledBitmap.zoomedIn) {
                         // Draw only the visible part of the bitmap, without smoothing so pixels are visible
                         var scale = preview.scale;
                         var sx0 = Math.max(0, Math.floor(-offsetX / scale));
                         var sy0 = Math.max(0, Math.floor(-offsetY / scale));
                         var sx1 = Math.min(preview.bitmap.width, Math.ceil((this.width - offsetX) / scale) + 1);
                         var sy1 = Math.min(preview.bitmap.height, Math.ceil((this.height - offsetY) / scale) + 1);
                         if (sx1 > sx0 && sy1 > sy0) {
                               graphics.smoothInterpolation = false;
                               graphics.drawScaledBitmapRect(sx0 * scale, sy0 * scale, sx1 * scale, sy1 * scale,
                                                             preview.bitmap, sx0, sy0, sx1, sy1);
                         }
                   } else if(preview.bitmap)
                         graphics.drawBitmap(0, 0, preview.scaledBitmap);
                   else
                         graphics.fillRect(0, 0, preview.scaledBitmap.width, preview.scaledBitmap.height, new Brush(0xff000000));
                   graphics.pen = new Pen(border_color,0);
                   graphics.drawRect(-1, -1, preview.scaledBitmap.width + 1, preview.scaledBitmap.height + 1);
             }
 
             if(preview.onCustomPaint)
             {
                   graphics.antialiasing = true;
                   graphics.scaleTransformation(preview.scale,preview.scale);
                   preview.onCustomPaint.call(this, graphics, x0, y0, x1, y1);
             }
             graphics.end();
       }
 
      this.zoomLabel_Label =new Label(this);
      this.zoomLabel_Label.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      this.zoomLabel_Label.text = "Zoom:";
      this.zoomVal_Label =new Label(this);
      this.zoomVal_Label.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      this.zoomVal_Label.text = "1:1";

      this.Xlabel_Label = new Label(this);
      this.Xlabel_Label.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      this.Xlabel_Label .text = "X:";
      this.Xval_Label = new Label(this);
      this.Xval_Label.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      this.Xval_Label.text = "---";
      this.Xval_Label.setMinWidth(this.font.width("00000"));
      this.Ylabel_Label = new Label(this);
      this.Ylabel_Label.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      this.Ylabel_Label.text = "Y:";
      this.Yval_Label = new Label(this);
      this.Yval_Label.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      this.Yval_Label.text = "---";
      this.Yval_Label.setMinWidth(this.font.width("00000"));
      this.SampleLabel_Label = new Label(this);
      this.SampleLabel_Label.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      this.SampleLabel_Label.text = "Val:";
      this.SampleLabel_Label.toolTip = "Displayed pixel value, one value for gray pixels, R G B values for color pixels.";
      this.SampleVal_Label = new Label(this);
      this.SampleVal_Label.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      this.SampleVal_Label.text = "---";
      this.SampleVal_Label.setMinWidth(this.font.width("0.000 0.000 0.000"));

      if (this.normalPreview && !this.standalone) {
            this.coordinatesLabel = new Label(this);
            this.coordinatesLabel.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
            this.coordinatesLabel.text = "X,Y:";
            this.coordinatesLabel.toolTip = "Zoom to 1:1 or larger view and click left mouse button to fill coordinates to the coordinates box.";
            this.coordinatesEdit = new Edit(this);
            this.coordinatesEdit.toolTip = "Zoom to 1:1 or larger view and click left mouse button to fill coordinates to the coordinates box.";
            
            this.coordinatesCopyFirstButton = new ToolButton( this );
            this.coordinatesCopyFirstButton.icon = this.parentDialog.scaledResource( ":/icons/left.png" );
            this.coordinatesCopyFirstButton.onClick = function () {
                  var preview = this.parent.parent;
                  if (preview.coordinatesEdit.text != "") {
                        preview.parentDialog.cometAlignFirstXY.text = preview.coordinatesEdit.text;
                        preview.parentDialog.par.comet_first_xy.val = preview.coordinatesEdit.text;
                  }
            };
            this.coordinatesCopyFirstButton.toolTip = "Copy coordinates to comet first image X₀,Y₀ coordinates.";

            this.coordinatesCopyLastButton = new ToolButton( this );
            this.coordinatesCopyLastButton.icon = this.parentDialog.scaledResource( ":/icons/right.png" );
            this.coordinatesCopyLastButton.onClick = function () {
                  var preview = this.parent.parent;
                  if (preview.coordinatesEdit.text != "") {
                        preview.parentDialog.cometAlignLastXY.text = preview.coordinatesEdit.text;
                        preview.parentDialog.par.comet_last_xy.val = preview.coordinatesEdit.text;
                  }
            };
            this.coordinatesCopyLastButton.toolTip = "Copy coordinates to comet last image X₁,Y₁ coordinates.";
      }

      this.coords_Frame = new Frame(this);
      this.coords_Frame.backgroundColor = 0xffffffff;
      this.coords_Frame.sizer = new HorizontalSizer;
      this.coords_Frame.sizer.margin = 2;
      this.coords_Frame.sizer.spacing = 4;
      this.coords_Frame.sizer.add(this.zoomLabel_Label);
      this.coords_Frame.sizer.add(this.zoomVal_Label);
      this.coords_Frame.sizer.addSpacing(6);
      this.coords_Frame.sizer.add(this.Xlabel_Label);
      this.coords_Frame.sizer.add(this.Xval_Label);
      this.coords_Frame.sizer.addSpacing(6);
      this.coords_Frame.sizer.add(this.Ylabel_Label);
      this.coords_Frame.sizer.add(this.Yval_Label);
      this.coords_Frame.sizer.addSpacing(6);
      this.coords_Frame.sizer.add(this.SampleLabel_Label);
      this.coords_Frame.sizer.add(this.SampleVal_Label);
      if (this.normalPreview && !this.standalone) {
            this.coords_Frame.sizer.addStretch();
            this.coords_Frame.sizer.add(this.coordinatesLabel);
            this.coords_Frame.sizer.add(this.coordinatesEdit);
            this.coords_Frame.sizer.add(this.coordinatesCopyFirstButton);
            this.coords_Frame.sizer.add(this.coordinatesCopyLastButton);
      }
      this.coords_Frame.sizer.addStretch();
      this.sizer = new VerticalSizer;
      this.sizer.add(this.buttons_Sizer);
      this.sizer.add(this.scroll_Sizer);
      this.sizer.add(this.coords_Frame);

      var width_overhead = this.scrollbox.viewport.width;
      var heigth_overhead = this.scrollbox.viewport.height;

      this.setScaledMinSize(this.size_x + width_overhead + 6, this.size_y + heigth_overhead + 6);

      } // initGUI

       forceRedraw()
       {
             if (this.par.debug.val) console.writeln(this.name + ":forceRedraw");
             this.scrollbox.viewport.update();
       }
 
       setSize(w, h)
       {
             if (this.par.debug.val) console.writeln(this.name + ":setSize");
             this.setScaledMinSize(w, h);
             this.width = w;
             this.height = h;
       }
 
       SetZoomOutLimit()
       {
            if (this.par.debug.val) console.writeln(this.name + ":SetZoomOutLimit:width ", this.scrollbox.viewport.width, ", height ", this.scrollbox.viewport.height);
            if (this.par.debug.val) console.writeln(this.name + ":SetZoomOutLimit:image.width ", this.bitmap.width, ", image.height ", this.bitmap.height);
             var scaleX = this.scrollbox.viewport.width/this.bitmap.width;
             var scaleY = this.scrollbox.viewport.height/this.bitmap.height;
             var scale = Math.min(scaleX,scaleY);
             if (this.fitWithoutZoomIn && scale > 1) {
                  // Image fits into the preview, show it 1:1
                  scale = 1;
             }
             this.zoomOutLimit = scale;
             if (this.par.debug.val) console.writeln(this.name + ":SetZoomOutLimit:scale ", scale, ", zoomOutLimit ", this.zoomOutLimit);
       }
 
       transform(x, y, preview)
       {
            // if (this.par.debug.val) console.writeln(this.name + ":transform");
            if (!preview.scaledBitmap) {
                  return new Point(x, y);
            }
            var scrollbox = preview.scrollbox;
             var ox = 0;
             var oy = 0;
             ox = scrollbox.maxHorizontalScrollPosition>0 ? -scrollbox.horizontalScrollPosition : (scrollbox.viewport.width-preview.scaledBitmap.width)/2;
             oy = scrollbox.maxVerticalScrollPosition>0 ? -scrollbox.verticalScrollPosition: (scrollbox.viewport.height-preview.scaledBitmap.height)/2;
             var coordPx = new Point((x - ox) / preview.scale, (y - oy) / preview.scale);
             return new Point(coordPx.x, coordPx.y);
       }

       // Show image coordinates p and the displayed pixel value in X, Y and Val fields.
       // Only the rendered bitmap is kept, so the value is the displayed 8-bit value scaled to 0-1.
       updateCoordinates(p)
       {
            var x = Math.max(0, Math.min(this.bitmap.width - 1, Math.floor(p.x)));
            var y = Math.max(0, Math.min(this.bitmap.height - 1, Math.floor(p.y)));
            this.Xval_Label.text = x.toString();
            this.Yval_Label.text = y.toString();
            try {
                  var argb = this.bitmap.pixel(x, y);
                  var r = ((argb >>> 16) & 0xff) / 255;
                  var g = ((argb >>> 8) & 0xff) / 255;
                  var b = (argb & 0xff) / 255;
                  if (r == g && g == b) {
                        this.SampleVal_Label.text = r.toFixed(3);
                  } else {
                        this.SampleVal_Label.text = r.toFixed(3) + " " + g.toFixed(3) + " " + b.toFixed(3);
                  }
            } catch(err) {
                  this.SampleVal_Label.text = "---";
            }
       }
 
       center()
       {
             var preview = this;
             var scrollbox = preview.scrollbox;
             var x = scrollbox.viewport.width / 2;
             var y = scrollbox.viewport.height / 2;
             var p =  this.transform(x, y, preview);
             return p;
       }
}

#endif // AUTOINTEGRATEPREVIEW_JS
