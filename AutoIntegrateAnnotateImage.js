/*
      AutoIntegrate AnnotateImage module.

      AnnotateImage wrapper routines for the AutoIntegrate script.

      Copyright (c) 2018-2026 Jarmo Ruuth.

This product is based on software from the PixInsight project, developed
by Pleiades Astrophoto and its contributors (https://pixinsight.com/).

*/

#ifndef AUTOINTEGRATEANNOTATEIMAGE_JS
#define AUTOINTEGRATEANNOTATEIMAGE_JS

#ifndef NO_SOLVER_LIBRARY

#define USE_ANNOTATE_LIBRARY true
#undef SETTINGS_MODULE
#define SETTINGS_MODULE      "AutoIntegrateAnnotateImage"
#undef TITLE

#include "../AnnotateImage/AnnotateImage.js"

#endif // NO_SOLVER_LIBRARY

class AutoIntegrateAnnotateImage extends Object
{

constructor(util, engine)
{
        super();
        this.util = util;
        this.engine = engine;
}

annotateImage(enhancementsWin, apply_directly)
{
    this.engine.addEnhancementsStep("Annotate image " + enhancementsWin.mainView.id);

    let annotationengine = new AnnotationEngine;
    annotationengine.Init(enhancementsWin);
    annotationengine.graphicsScale = this.engine.par.enhancements_annotate_image_scale.val;
    if (apply_directly) {
        annotationengine.outputMode = 1; // annotationengine.OutputMode.Overlay
    }
    try {
        annotationengine.Render();
    } catch (ex) {
        this.util.throwFatalError( "*** Annotate image error: " + ex.toString() );
    }

    var annotatedImgWin = this.util.findWindow(enhancementsWin.mainView.id + "_annotated");
    if (annotatedImgWin == null) {
        this.util.throwFatalError( "*** Annotate image error: Annotated image window " + enhancementsWin.mainView.id + "_annotated  not found." );
    }
    
    if (apply_directly) {
        var bitmap = this.util.getWindowBitmap(annotatedImgWin);
        enhancementsWin.mainView.image.blend(bitmap);
        enhancementsWin.mainView.endProcess();
        this.util.closeOneWindow(annotatedImgWin);
        bitmap.clear();
    }

    return annotatedImgWin;
}

} // AutoIntegrateAnnotateImage

#endif // AUTOINTEGRATEANNOTATEIMAGE_JS
