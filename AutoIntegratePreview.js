// Interface function
//
// SetImage = function(image, txt)
// UpdateImage = function(image, txt)
// showClippedImage = function()
// forceRedraw = function()
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
function AutoIntegrateMaxPreviewDialog(engine, util, global, image, txt)
{
      this.__base__ = Dialog;
      this.__base__();
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
      this.adjustToContents();
      this.setFixedSize();
}

AutoIntegrateMaxPreviewDialog.prototype = new Dialog;

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
function AutoIntegratePreviewControl(parentDialog, name, engine, util, global, size_x, size_y, call_from_max_preview)
{
       this.__base__ = Frame;
       this.__base__(parentDialog);

       this.name = name;

       var par = global.par;

       if (call_from_max_preview) {
            this.normalPreview = false;
      } else {   
            this.normalPreview = true;
      }
#ifdef AUTOINTEGRATE_STANDALONE
      this.standalone = true;
#else
      this.standalone = false;
#endif

      this.saveNonclippedImage = null;

       // Set image window and bitmap
       this.SetImage = function(image, txt)
       {
             if (par.debug.val) console.writeln(this.name + ":SetImage:image " + image.width + "x" + image.height + ", txt " + txt);
             if (this.image) {
                  this.image.free();
             }
             this.image = new Image( image );
             this.bitmap = this.image.render();
             this.scaledBitmap = null;
             this.SetZoomOutLimit();
             this.UpdateZoom(-100);
             if (txt) {
                  this.image_name_Label.text = txt;
            } else {
                  this.image_name_Label.text = "";
            }
            this.saveNonclippedImage = null;
      }
 
       // Update image window and bitmap
       this.UpdateImage = function(image, txt)
       {
             if (par.debug.val) console.writeln(this.name + ":UpdateImage:image " + image.width + "x" + image.height + ", txt " + txt);
             if (this.zoom == this.zoomOutLimit) {
                   this.SetImage(image, txt);
             } else {
                  if (this.image) {
                        this.image.free();
                   }
                  this.image = new Image( image );
                   this.bitmap = this.image.render();
                   this.scaledBitmap = null;
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
                  this.saveNonclippedImage = null;
            }
       }

       this.showClippedImage = function()
       {
            if (this.saveNonclippedImage) {
                  console.writeln("showNonclippedImage");
                  this.UpdateImage(this.saveNonclippedImage, this.image_name_Label.text);
                  return;
            }

            console.writeln("showClippedImage");

            var imgWin = util.findWindow("AutoIntegrate_preview_clipped");
            if (imgWin) {
                  imgWin.forceClose();
            }

            // Create a new window from the image
            imgWin = util.createWindowFromImage(this.image, "AutoIntegrate_preview_clipped");

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
            P.newImageColorSpace = PixelMath.prototype.SameAsTarget;
            P.newImageSampleFormat = PixelMath.prototype.SameAsTarget;
            /*
             * Read-only properties
             *
            P.outputData = [ // globalVariableId, globalVariableRK, globalVariableG, globalVariableB
            ];
             */

            P.executeOn(imgWin.mainView, false);

            // Save the original non-clipped image
            var saveNonclippedImage = this.image;
            this.image = null;

            this.UpdateImage(imgWin.mainView.image, this.image_name_Label.text);

            imgWin.forceClose();

            this.saveNonclippedImage = saveNonclippedImage;
       }
 
       this.UpdateZoom = function (newZoom, refPoint)
       {
            if (!this.bitmap && !this.image) {
                  return;
            }
            if (newZoom < this.zoomOutLimit) {
                   newZoom = this.zoomOutLimit;
             } else if (newZoom >= 1) {
                   newZoom = 1;
             }
             if (par.debug.val) console.writeln(this.name + ":UpdateZoom:newZoom " + newZoom);
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
             this.scaledBitmap = null;
            if (this.zoom >= 1) {
                  this.zoomVal_Label.text = "1:1";
            } else {
                  this.zoomVal_Label.text = format("1:%d", Math.ceil(1 / this.zoom));
            }
            if (this.bitmap) {
                   if (this.zoom > this.zoomOutLimit) {
                        if (par.debug.val) console.writeln(this.name + ":UpdateZoom:this.scale " + this.scale);
                        this.scaledBitmap = this.bitmap.scaled(this.scale);
                   } else {
                        if (par.debug.val) console.writeln(this.name + ":UpdateZoom:0.98 * this.scale " + (0.98 * this.scale));
                        this.scaledBitmap = this.bitmap.scaled(0.98 * this.scale);
                   }
             } else {
                   this.scaledBitmap = {width:this.image.width * this.scale, height:this.image.height * this.scale};
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
 
      this.zoomIn_Button = new ToolButton( this );
      this.zoomIn_Button.icon = this.scaledResource( ":/icons/zoom-in.png" );
      this.zoomIn_Button.setScaledFixedSize( 20, 20 );
      this.zoomIn_Button.toolTip = "Zoom in";
      this.zoomIn_Button.onClick = function()
      {
            if (par.debug.val) console.writeln(this.parent.name + ":zoom-in");
            this.parent.UpdateZoom(this.parent.zoom + this.parent.zoomOutLimit);
      };

      this.zoomOut_Button = new ToolButton( this );
      this.zoomOut_Button.icon = this.scaledResource( ":/icons/zoom-out.png" );
      this.zoomOut_Button.setScaledFixedSize( 20, 20 );
      this.zoomOut_Button.toolTip = "Zoom out";
      this.zoomOut_Button.onClick = function()
      {
            if (par.debug.val) console.writeln(this.parent.name + ":zoom-out");
            this.parent.UpdateZoom(this.parent.zoom - this.parent.zoomOutLimit);
      };

      this.zoom11_Button = new ToolButton( this );
      this.zoom11_Button.icon = this.scaledResource( ":/icons/zoom-1-1.png" );
      this.zoom11_Button.setScaledFixedSize( 20, 20 );
      this.zoom11_Button.toolTip = "Zoom 1:1";
      this.zoom11_Button.onClick = function()
      {
            if (par.debug.val) console.writeln(this.parent.name + ":zoom-1-1");
            this.parent.UpdateZoom(1);
      };

      this.zoomFit_Button = new ToolButton( this );
      this.zoomFit_Button.icon = this.scaledResource( ":/icons/zoom.png" );
      this.zoomFit_Button.setScaledFixedSize( 20, 20 );
      this.zoomFit_Button.toolTip = "Zoom fit";
      this.zoomFit_Button.onClick = function()
      {
            if (par.debug.val) console.writeln(this.parent.name + ":zoom");
            this.parent.UpdateZoom(-100);
      };

      if (this.normalPreview) {
            this.save_Button = new ToolButton( this );
            this.save_Button.icon = this.scaledResource( ":/icons/save-as.png" );
            this.save_Button.setScaledFixedSize( 20, 20 );
            this.save_Button.toolTip = "Save image to a file.";
            this.save_Button.onClick = function()
            {
                  if (!this.parent.bitmap) {
                        console.noteln("No image to save");
                        return;
                  }
                  let saveFileDialog = new SaveFileDialog();
                  saveFileDialog.caption = "Save As TIFF";
                  if (global.outputRootDir == "") {
                        var path = global.ppar.lastDir;
                  } else {
                        var path = global.outputRootDir;
                  }
                  if (path != "") {
                        path = util.ensurePathEndSlash(path);
                  }
                  saveFileDialog.initialPath = path + "preview" + ".tif";
                  saveFileDialog.filters = [["TIFF files", "*.tif"], ["JPEG files", "*.jpg"]];
                  if (!saveFileDialog.execute()) {
                        console.noteln("Preview image not saved");
                        return;
                  }
                  var copy_win = util.createWindowFromBitmap(this.parent.bitmap, "AutoIntegrate_preview_savetmp");
                  console.writeln("save image to ", saveFileDialog.fileName + ", bits ", copy_win.bitsPerSample + ", width ", copy_win.mainView.image.width + ", height ", copy_win.mainView.image.height + ", id ", copy_win.mainView.id);
                  if (copy_win.bitsPerSample != 16) {
                        console.writeln("set bits to 16");
                        copy_win.setSampleFormat(16, false);
                  }
                  // Save image. No format options, no warning messages, 
                  // no strict mode, no overwrite checks.
                  if (!copy_win.saveAs(saveFileDialog.fileName, false, false, false, false)) {
                        console.criticalln("Failed to save image: " + saveFileDialog.fileName);
                  } else {
                        console.writeln("Saved image: " + saveFileDialog.fileName);
                  }
                  util.closeOneWindow(copy_win);
            };
      }
      if (this.normalPreview) {
            this.maxPreview_Button = new ToolButton( this );
            this.maxPreview_Button.icon = this.scaledResource( ":/real-time-preview/full-view.png" );
            this.maxPreview_Button.setScaledFixedSize( 20, 20 );
            this.maxPreview_Button.toolTip = "Open a new dialog to view the image in (almost) full screen size.";
            this.maxPreview_Button.onClick = function()
            {
                  let maxPreviewDialog = new AutoIntegrateMaxPreviewDialog(engine, util, global, this.parent.image, this.parent.image_name_Label.text);
                  maxPreviewDialog.execute();
                  gc(false);
            };
      }
      this.image_name_Label = new Label( this );
      this.image_name_Label.text = "";
      this.image_name_Label.textAlignment = TextAlign_Right | TextAlign_VertCenter;

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
       this.scrollbox = new ScrollBox(this);
       this.scrollbox.autoScroll = true;
       this.scrollbox.tracking = true;
       this.scrollbox.cursor = new Cursor(StdCursor_Arrow);
 
       this.scroll_Sizer = new HorizontalSizer;
       this.scroll_Sizer.add( this.scrollbox );
 
       this.SetZoomOutLimit = function()
       {
            if (par.debug.val) console.writeln(this.name + ":SetZoomOutLimit:width ", this.scrollbox.viewport.width, ", height ", this.scrollbox.viewport.height);
            if (par.debug.val) console.writeln(this.name + ":SetZoomOutLimit:image.width ", this.image.width, ", image.height ", this.image.height);
             var scaleX = this.scrollbox.viewport.width/this.image.width;
             var scaleY = this.scrollbox.viewport.height/this.image.height;
             var scale = Math.min(scaleX,scaleY);
             this.zoomOutLimit = scale;
             if (par.debug.val) console.writeln(this.name + ":SetZoomOutLimit:scale ", scale, ", this.zoomOutLimit ", this.zoomOutLimit);
       }
 
       this.scrollbox.onHorizontalScrollPosUpdated = function (newPos)
       {
             this.viewport.update();
       }
       this.scrollbox.onVerticalScrollPosUpdated = function (newPos)
       {
             this.viewport.update();
       }
 
       this.forceRedraw = function()
       {
             if (par.debug.val) console.writeln(this.name + ":forceRedraw");
             this.scrollbox.viewport.update();
       };
 
       this.setSize = function(w, h)
       {
             if (par.debug.val) console.writeln(this.name + ":setSize");
             this.setScaledMinSize(w, h);
             this.width = w;
             this.heigth = h;
       }
 
       this.scrollbox.viewport.onMouseWheel = function (x, y, delta, buttonState, modifiers)
       {
             var preview = this.parent.parent;
             preview.UpdateZoom(preview.zoom + (delta > 0 ? preview.zoomOutLimit : -preview.zoomOutLimit), new Point(x,y));
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
 
       this.scrollbox.viewport.onMouseMove = function ( x, y, buttonState, modifiers )
       {
             var preview = this.parent.parent;

             if (!preview.image) {
                  return;
             }
             var p =  preview.transform(x, y, preview);

            var val = Math.floor(p.x);
            if (val < 0) {
                  val = 0;
            } else if (val >= preview.image.width) {
                  val = preview.image.width - 1;
            }
            preview.Xval_Label.text = val.toString();
            var val = Math.floor(p.y);
            if (val < 0) {
                  val = 0;
            } else if (val >= preview.image.height) {
                  val = preview.image.height - 1;
            }
            preview.Yval_Label.text = val.toString();
            try {
                  var val = preview.image.sample(Math.floor(p.x), Math.floor(p.y));
                  preview.SampleVal_Label.text = val.toFixed(5);
            } catch(err) {
            }

             if(preview.onCustomMouseMove)
             {
                   preview.onCustomMouseMove.call(this, p.x, p.y, buttonState, modifiers )
             }
       }
 
       this.scrollbox.viewport.onMouseRelease = function (x, y, button, buttonState, modifiers)
       {
             var preview = this.parent.parent;
 
             var p =  preview.transform(x, y, preview);

             if (preview.zoom == 1 && preview.coordinatesEdit) {
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
            if (par.debug.val) console.writeln(preview.name + ":onResize");
             if(preview.image && preview.scaledBitmap != null)
             {
                  this.parent.maxHorizontalScrollPosition = Math.max(0, preview.scaledBitmap.width - wNew);
                   this.parent.maxVerticalScrollPosition = Math.max(0, preview.scaledBitmap.height - hNew);
                   if (par.debug.val) console.writeln(preview.name + ":onResize, preview.zoom " + preview.zoom + ", preview.zoomOutLimit " + preview.zoomOutLimit);
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
            if (par.debug.val) console.writeln(preview.name + ":onPaint");
             var graphics = new VectorGraphics(this);
             if (global.ppar.preview.black_background) {
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
                   if(preview.bitmap)
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
 
       this.transform = function(x, y, preview)
       {
            // if (par.debug.val) console.writeln(this.name + ":transform");
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
 
       this.center = function()
       {
             var preview = this;
             var scrollbox = preview.scrollbox;
             var x = scrollbox.viewport.width / 2;
             var y = scrollbox.viewport.height / 2;
             var p =  this.transform(x, y, preview);
             return p;
       }

      this.zoomLabel_Label =new Label(this);
      this.zoomLabel_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.zoomLabel_Label.text = "Zoom:";
      this.zoomVal_Label =new Label(this);
      this.zoomVal_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.zoomVal_Label.text = "1:1";

      this.Xlabel_Label = new Label(this);
      this.Xlabel_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.Xlabel_Label .text = "X:";
      this.Xval_Label = new Label(this);
      this.Xval_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.Xval_Label.text = "---";
      this.Ylabel_Label = new Label(this);
      this.Ylabel_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.Ylabel_Label.text = "Y:";
      this.Yval_Label = new Label(this);
      this.Yval_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.Yval_Label.text = "---";
      this.SampleLabel_Label = new Label(this);
      this.SampleLabel_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.SampleLabel_Label.text = "Val:";
      this.SampleVal_Label = new Label(this);
      this.SampleVal_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.SampleVal_Label.text = "---";

      if (this.normalPreview && !this.standalone) {
            this.coordinatesLabel = new Label(this);
            this.coordinatesLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
            this.coordinatesLabel.text = "X,Y:";
            this.coordinatesLabel.toolTip = "Zoom to 1:1 view and click left mouse button to fill coordinates to the coordinates box.";
            this.coordinatesEdit = new Edit(this);
            this.coordinatesEdit.toolTip = "Zoom to 1:1 view and click left mouse button to fill coordinates to the coordinates box.";
            
            this.coordinatesCopyFirstButton = new ToolButton( this );
            this.coordinatesCopyFirstButton.icon = parentDialog.scaledResource( ":/icons/left.png" );
            this.coordinatesCopyFirstButton.onClick = function () {
                  var preview = this.parent.parent;
                  if (preview.coordinatesEdit.text != "") {
                        parentDialog.cometAlignFirstXY.text = preview.coordinatesEdit.text;
                        par.comet_first_xy.val = preview.coordinatesEdit.text;
                  }
            };
            this.coordinatesCopyFirstButton.toolTip = "Copy coordinates to comet first image X₀,Y₀ coordinates.";

            this.coordinatesCopyLastButton = new ToolButton( this );
            this.coordinatesCopyLastButton.icon = parentDialog.scaledResource( ":/icons/right.png" );
            this.coordinatesCopyLastButton.onClick = function () {
                  var preview = this.parent.parent;
                  if (preview.coordinatesEdit.text != "") {
                        parentDialog.cometAlignLastXY.text = preview.coordinatesEdit.text;
                        par.comet_last_xy.val = preview.coordinatesEdit.text;
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

      this.setScaledMinSize(size_x + width_overhead + 6, size_y + heigth_overhead + 6);
}
 
AutoIntegratePreviewControl.prototype = new Frame;

#endif // AUTOINTEGRATEPREVIEW_JS
