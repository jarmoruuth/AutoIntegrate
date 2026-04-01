/*
      AutoIntegrate ImageSolver module.

      ImageSolver wrapper and plate-solving routines for the AutoIntegrate script.

      Copyright (c) 2018-2026 Jarmo Ruuth.

This product is based on software from the PixInsight project, developed
by Pleiades Astrophoto and its contributors (https://pixinsight.com/).

*/

#ifndef AUTOINTEGRATEIMAGESOLVER_JS
#define AUTOINTEGRATEIMAGESOLVER_JS

#ifndef NO_SOLVER_LIBRARY

/* Settings to ImageSolver script. This is copied from WBPP script. */
#define USE_SOLVER_LIBRARY true
#define SETTINGS_MODULE "AutoIntegrateSolver"
#define STAR_CSV_FILE   File.systemTempDirectory + "/stars.csv"

#include "../ImageSolver/ImageSolver.js"

#endif // NO_SOLVER_LIBRARY

class AutoIntegrateImageSolver extends Object
{
constructor(global, util, flowchart, engine) {
      super();
      this.global = global;
      this.util = util;
      this.flowchart = flowchart;
      this.engine = engine;
      this.par = global.par;

      this.solved_imageId = null;           // successfully solved image, used to copy astrometric solution
      this.current_telescope_name = "";

      this.telescope_info = [
            [ 'AUS-2-CMOS', 382, 3.76 ],
            [ 'SPA-1-CMOS', 382, 3.76 ],
            [ 'SPA-2-CMOS', 5600, 3.76 ],
            [ 'SPA-3-CMOS', 382, 3.76 ],
            [ 'CHI-1-CMOS', 3962, 3.76 ],
            [ 'CHI-2-CMOS', 1900, 3.76 ],
            [ 'CHI-3-CMOS', 6800, 3.76 ],
            [ 'CHI-4-CMOS', 1900, 3.76 ],
            [ 'CHI-5-CMOS', 200, 3.76 ],
            [ 'CHI-6-CMOS', 600, 3.76 ]
      ];
} // constructor

// Find focal length using telescope name saved into variable this.current_telescope_name
find_focal_length()
{
      for (var i = 0; i < this.telescope_info.length; i++) {
            if (this.current_telescope_name.indexOf(this.telescope_info[i][0]) != -1) {
                  console.writeln("Telescope " + this.telescope_info[i][0] + " focal length " + this.telescope_info[i][1]);
                  return this.telescope_info[i][1];
            }
      }
      return 0;
}

// Find pixel size using telescope name saved into variable this.current_telescope_name
find_pixel_size()
{
      for (var i = 0; i < this.telescope_info.length; i++) {
            if (this.current_telescope_name.indexOf(this.telescope_info[i][0]) != -1) {
                  console.writeln("Telescope " + this.telescope_info[i][0] + " pixel size " + this.telescope_info[i][2]);
                  return this.telescope_info[i][2];
            }
      }
      return 0;
}

findCurrentTelescope(imgWin)
{
      for (var i = 0; i < imgWin.keywords.length; i++) {
            switch (imgWin.keywords[i].name) {
                  case "TELESCOP":
                        this.current_telescope_name = imgWin.keywords[i].strippedValue.trim();
                        console.writeln("TELESCOP=" +  this.current_telescope_name);
                        return;
                  default:
                        break;
            }
      }
}

findBinning(imgWin)
{
      for (var i = 0; i < imgWin.keywords.length; i++) {
            switch (imgWin.keywords[i].name) {
                  case "XBINNING":
                        var value = imgWin.keywords[i].strippedValue.trim();
                        console.writeln("XBINNING=" + value);
                        var binning = parseInt(value);
                        return binning;
                  default:
                        break;
            }
      }
      return 1;
}

printImageSolverMetadata(solver)
{
      console.writeln("Image metadata for SolveImage:");

      console.writeln("solver.metadata.focal: " + solver.metadata.focal);
      console.writeln("solver.metadata.useFocal: " + solver.metadata.useFocal);
      console.writeln("solver.metadata.xpixsz: " + solver.metadata.xpixsz);
      console.writeln("solver.metadata.resolution: " + solver.metadata.resolution);
      console.writeln("solver.metadata.referenceSystem: " + solver.metadata.referenceSystem);
      console.writeln("solver.metadata.ra: " + solver.metadata.ra);
      console.writeln("solver.metadata.dec: " + solver.metadata.dec);
      console.writeln("solver.metadata.epoch: " + solver.metadata.epoch);
      console.writeln("solver.metadata.observationTime: " + solver.metadata.observationTime);
      console.writeln("solver.metadata.topocentric: " + solver.metadata.topocentric);

      console.writeln("solverCfg.version: " + solver.solverCfg.version);
      console.writeln("solverCfg.magnitude: " + solver.solverCfg.magnitude);
      console.writeln("solverCfg.autoMagnitude: " + solver.solverCfg.autoMagnitude);
      console.writeln("solverCfg.generateErrorImg: " + solver.solverCfg.generateErrorImg);
      console.writeln("solverCfg.structureLayers: " + solver.solverCfg.structureLayers);
      console.writeln("solverCfg.minStructureSize: " + solver.solverCfg.minStructureSize);
      console.writeln("solverCfg.hotPixelFilterRadius: " + solver.solverCfg.hotPixelFilterRadius);
      console.writeln("solverCfg.noiseReductionFilterRadius: " + solver.solverCfg.noiseReductionFilterRadius);
      console.writeln("solverCfg.sensitivity: " + solver.solverCfg.sensitivity);
      console.writeln("solverCfg.peakResponse: " + solver.solverCfg.peakResponse); // row 20
      console.writeln("solverCfg.brightThreshold: " + solver.solverCfg.brightThreshold);
      console.writeln("solverCfg.maxStarDistortion: " + solver.solverCfg.maxStarDistortion);
      console.writeln("solverCfg.autoPSF: " + solver.solverCfg.autoPSF);
      console.writeln("solverCfg.catalogMode: " + solver.solverCfg.catalogMode);
      console.writeln("solverCfg.vizierServer: " + solver.solverCfg.vizierServer);
      console.writeln("solverCfg.showStars: " + solver.solverCfg.showStars);
      console.writeln("solverCfg.showStarMatches: " + solver.solverCfg.showStarMatches);
      console.writeln("solverCfg.showSimplifiedSurfaces: " + solver.solverCfg.showSimplifiedSurfaces);
      console.writeln("solverCfg.showDistortion: " + solver.solverCfg.showDistortion);
      console.writeln("solverCfg.generateDistortModel: " + solver.solverCfg.generateDistortModel); // row 30
      console.writeln("solverCfg.catalog: " + solver.solverCfg.catalog);
      console.writeln("solverCfg.distortionCorrection: " + solver.solverCfg.distortionCorrection);
      console.writeln("solverCfg.splineOrder: " + solver.solverCfg.splineOrder);
      console.writeln("solverCfg.splineSmoothing: " + solver.solverCfg.splineSmoothing);
      console.writeln("solverCfg.enableSimplifier: " + solver.solverCfg.enableSimplifier);
      console.writeln("solverCfg.simplifierRejectFraction: " + solver.solverCfg.simplifierRejectFraction);
      console.writeln("solverCfg.outlierDetectionRadius: " + solver.solverCfg.outlierDetectionRadius);
      console.writeln("solverCfg.outlierDetectionMinThreshold: " + solver.solverCfg.outlierDetectionMinThreshold);
      console.writeln("solverCfg.outlierDetectionSigma: " + solver.solverCfg.outlierDetectionSigma);
      console.writeln("solverCfg.useActive: " + solver.solverCfg.useActive);
      console.writeln("solverCfg.outSuffix: " + solver.solverCfg.outSuffix);
      console.writeln("solverCfg.projection: " + solver.solverCfg.projection);
      console.writeln("solverCfg.projectionOriginMode: " + solver.solverCfg.projectionOriginMode);
      console.writeln("solverCfg.restrictToHQStars: " + solver.solverCfg.restrictToHQStars);
      console.writeln("solverCfg.tryApparentCoordinates: " + solver.solverCfg.tryApparentCoordinates);
      console.writeln("solverCfg.tryExhaustiveInitialAlignment: " + solver.solverCfg.tryExhaustiveInitialAlignment);
}

imageIsAlreadySolved(imgWin)
{
      return imgWin.astrometricSolutionSummary().length > 0;
}

runImageSolverEx(id, use_defaults, use_dialog, xpixsz_multiplier)
{
      console.writeln("runImageSolverEx: image " + id + ", use default info " + use_defaults + ", use dialog " + use_dialog);
      this.engine.checkCancel();

      var imgWin = ImageWindow.windowById(id);

      if (imgWin.astrometricSolutionSummary().length > 0) {
            if (this.par.target_forcesolve.val) {
                  console.writeln("runImageSolverEx: image " + id + " already has been plate solved, but we are resolving it again.");
            } else {
                  console.writeln(imgWin.astrometricSolutionSummary());
                  if (!this.solved_imageId) {
                        console.writeln("runImageSolverEx: save already solved image image " + imgWin.mainView.id);
                        this.solved_imageId = imgWin.mainView.id;
                  }
                  console.writeln("runImageSolverEx: image " + id + " already has been plate solved.");
                  return true;
            }
      }
      if (!this.par.target_forcesolve.val && this.solved_imageId) {
            let solved_imageWin = ImageWindow.windowById(this.solved_imageId);
            if (solved_imageWin != null && solved_imageWin.astrometricSolutionSummary().length > 0) {
                  // Image does not have astrometric solution but we have already solved an image.
                  // Copy the astrometric solution from the solved image.
                  console.writeln("runImageSolverEx: copy astrometric solution from an already solved image image " + this.solved_imageId + " to " + imgWin.mainView.id);
                  imgWin.copyAstrometricSolution(solved_imageWin);
                  return true;
            }
      }

      this.util.addProcessingStepAndStatusInfo("ImageSolver on image " + imgWin.mainView.id);

      var succ = false;

      try {
            var solver = new ImageSolver();

            solver.initialize(imgWin);

            if (!this.current_telescope_name || this.current_telescope_name == "") {
                  this.findCurrentTelescope(imgWin);
            } else {
                  console.writeln("Using current telescope " + this.current_telescope_name);
            }

            /*
             * Initialize solver.metadata values with the current image metadata.
             *
             * The following fields are set:
             *    solver.metadata.ra
             *    solver.metadata.dec
             *    solver.metadata.focal
             *    solver.metadata.xpixsz
             *    solver.metadata.resolution
             *    solver.metadata.referenceSystem
             *    solver.metadata.useFocal
             */

            console.writeln("Telescope: " + this.current_telescope_name);
            console.writeln("Image metadata");
            console.writeln("  coordinates RA DEC: " + solver.metadata.ra + " " + solver.metadata.dec);
            console.writeln("  focal length: " + solver.metadata.focal);
            console.writeln("  resolution: " + solver.metadata.resolution);
            console.writeln("  xpixsz: " + solver.metadata.xpixsz);
            console.writeln("  referenceSystem: " + solver.metadata.referenceSystem);
            console.writeln("  useFocal: " + solver.metadata.useFocal);
            console.writeln("  topocentric: " + solver.metadata.topocentric);

            // This fails: console.writeln("  solver.metadata: " + JSON.stringify(solver.metadata, null, 2));

            if (!use_defaults) {
                  solver.metadata.referenceSystem = "ICRS";
                  solver.metadata.useFocal = true;
                  solver.metadata.topocentric = false;
            }
            if (this.par.target_radec.val != '') {
                  let radec = this.par.target_radec.val.trim().split(/\s+/);
                  if (radec.length != 2) {
                        this.util.throwFatalError("Incorrect RA DEC value " + this.par.target_radec.val);
                  }
                  solver.metadata.ra = parseFloat(radec[0]) * 15;
                  solver.metadata.dec = parseFloat(radec[1]);
                  console.writeln("Using user given coordinates RA DEC: " + solver.metadata.ra + " " + solver.metadata.dec);
            } else {
                  console.writeln("Using image metadata coordinates RA DEC: " + solver.metadata.ra + " " + solver.metadata.dec);
            }
            var metadata_changed = false;
            if (this.par.target_focal.val != '') {
                  var focal_len = parseFloat(this.par.target_focal.val);
                  console.writeln("Using user given focal length: " + focal_len);
                  solver.metadata.focal = focal_len;
                  metadata_changed = true;
            } else if (!use_defaults) {
                  var focal_len = this.find_focal_length();
                  if (focal_len != 0) {
                        console.writeln("Using telescope name based focal length: " + focal_len);
                        solver.metadata.focal = focal_len;
                        metadata_changed = true;
                  }
            } else {
                  var focal_len = 0;
            }
            if (focal_len == 0) {
                  console.writeln("Using image metadata focal length: " + solver.metadata.focal);
            }
            if (this.par.target_pixel_size.val != '') {
                  var pixel_size = parseFloat(this.par.target_pixel_size.val);
                  console.writeln("Using user given pixel size: " + pixel_size);
                  solver.metadata.xpixsz = pixel_size;
                  metadata_changed = true;
            } else if (!use_defaults) {
                  var pixel_size = this.find_pixel_size();
                  if (pixel_size != 0) {
                        console.writeln("Using telescope name based pixel size: " + pixel_size);
                        solver.metadata.xpixsz = pixel_size;
                        metadata_changed = true;
                  }
            } else {
                  var pixel_size = 0;
            }
            if (pixel_size == 0) {
                  console.writeln("Using image metadata pixel size: " + solver.metadata.xpixsz);
                  pixel_size = solver.metadata.xpixsz;
            }
            if (pixel_size != 0) {
                  if (this.par.target_binning.val != 'None') {
                        if (this.par.target_binning.val == 'Auto') {
                              if (!use_defaults) {
                                    var binning = this.findBinning(imgWin);
                                    pixel_size = binning * pixel_size;
                                    console.writeln("Using auto binning " + binning + ", adjusted pixel size: " + pixel_size);
                              } else {
                                    console.writeln("Auto binning, using metadata pixel size: " + pixel_size);
                              }
                        } else {
                              var binning = parseInt(this.par.target_binning.val);
                              pixel_size = binning * pixel_size;
                              console.writeln("Using user given binning " + this.par.target_binning.val + ", adjusted pixel size: " + pixel_size);
                        }
                  }
                  if (this.par.target_drizzle.val != 'None') {
                        if (this.par.target_drizzle.val == 'Auto') {
                              var scale = this.util.findDrizzle(imgWin);
                              if (scale > 1) {
                                    pixel_size = pixel_size / scale;
                                    console.writeln("Using drizzle scale " + scale + ", adjusted pixel size: " + pixel_size);
                              }
                        } else {
                              var scale = parseInt(this.par.target_drizzle.val);
                              if (scale > 1) {
                                    pixel_size = pixel_size / scale;
                                    console.writeln("Using user given drizzle scale " + this.par.target_drizzle.val + ", adjusted pixel size: " + pixel_size);
                              }
                        }
                  }
                  if (solver.metadata.xpixsz != pixel_size) {
                        solver.metadata.xpixsz = pixel_size;
                        metadata_changed = true;
                  }
            }
            if (xpixsz_multiplier != 1) {
                  solver.metadata.xpixsz = solver.metadata.xpixsz * xpixsz_multiplier;
                  console.writeln("Using adjusted pixel size: " + solver.metadata.xpixsz + " (multiplier " + xpixsz_multiplier + ")");
                  metadata_changed = true;
            }
            if (solver.metadata.xpixsz && solver.metadata.focal && metadata_changed) {
                  solver.metadata.resolution = solver.metadata.xpixsz / solver.metadata.focal * 0.18 / Math.PI;
                  console.writeln("Using calculated resolution: " + solver.metadata.resolution);
            } else {
                  console.writeln("Using metadata resolution: " + solver.metadata.resolution);
            }

            this.printImageSolverMetadata(solver);

            if (use_dialog) {
                  //imgWin.show();
                  //console.hide();
                  imgWin.bringToFront();
                  let dialog = new ImageSolverDialog( solver.solverCfg, solver.metadata, false /*showTargetImage*/ );
                  succ = dialog.execute();
                  if (0 && !this.global.console_hidden) {
                        console.show();
                  }
                  if (!succ) {
                        console.writeln("ImageSolver dialog cancelled");
                        return false;
                  }
                  solver.solverCfg = dialog.solverCfg;
                  solver.metadata = dialog.metadata;

                  console.writeln("Image metadata from dialog:");
                  this.printImageSolverMetadata(solver);
            }
            /*
             * Solve image
             */

            console.writeln("runImageSolverEx: call SolveImage");
            // solveImage will throw an exception if it fails
            solver.solveImage(imgWin);
            succ = true;
            if (this.global.pixinsight_version_num < 1080902) {
                  solver.metadata.Print();
            } else {
                  console.writeln(imgWin.astrometricSolutionSummary());
            }
            solver.solverCfg.SaveSettings();
            solver.solverCfg.SaveParameters();
            solver.metadata.SaveSettings();
            solver.metadata.SaveParameters();

            console.writeln("runImageSolverEx: solveImage succeeded on image "+ id);
      } catch (err) {
            console.writeln("runImageSolverEx: exception error, solveImage failed on image " + id);
            this.util.addCriticalStatus(err.toString());
            succ = false;
      }
      if (!succ) {
            console.writeln("solver.metadata.focal: " + solver.metadata.focal);
            console.writeln("solver.metadata.xpixsz: " + solver.metadata.xpixsz);
            console.writeln("solver.metadata.resolution: " + solver.metadata.resolution);
            console.writeln("solver.metadata.ra: " + solver.metadata.ra);
            console.writeln("solver.metadata.dec: " + solver.metadata.dec);
            console.writeln("ImageSolver failed on image " + id);
            return false
      } else {
            this.solved_imageId = imgWin.mainView.id;
            console.writeln("runImageSolverEx: save already solved image image " + imgWin.mainView.id);
            return true;
      }
}

runImageSolverVariations(id)
{
      var solved = this.runImageSolverEx(id, true, false, 1);
      if (!solved) {
            console.writeln("runImageSolver: retrying with smaller xpixsz");
            solved = this.runImageSolverEx(id, true, false, 0.5);
      }
      if (!solved) {
            console.writeln("runImageSolver: retrying with bigger xpixsz");
            solved = this.runImageSolverEx(id, true, false, 2);
      }
      if (!solved) {
            console.writeln("runImageSolver: retrying with telescope info");
            solved = this.runImageSolverEx(id, false, false, 1);
      }
      return solved;
}

runImageSolver(id)
{
      console.writeln("runImageSolver on image " + id);
      var node = this.flowchart.flowchartOperation("ImageSolver");
      if (this.global.get_flowchart_data) {
            return;
      }
      var solved = this.runImageSolverVariations(id);
      if (!solved) {
            // Delete possible old copy windows
            let copyWin = this.util.findWindow("AutoIntegrateImageSolverCopy");
            if (copyWin) {
                  copyWin.forceClose();
            }
            // Make a copy of image and try with noise reducted image
            console.writeln("runImageSolver: copy image and try with noise reducted image");
            let imgWin = ImageWindow.windowById(id);
            copyWin = this.util.copyWindow(imgWin, "AutoIntegrateImageSolverCopy");
            if (this.par.use_blurxterminator.val) {
                  console.writeln("runImageSolver: runBlurXTerminator on " + copyWin.mainView.id);
                  this.engine.runBlurXTerminator(imgWin, false, true);
            }
            console.writeln("runImageSolver: runNoiseReduction on " + copyWin.mainView.id);
            this.engine.runNoiseReductionEx(imgWin, null, 3, true);
            console.writeln("runImageSolver: runImageSolverVariations on " + copyWin.mainView.id);
            solved = this.runImageSolverVariations(id);
            if (solved) {
                  imgWin.copyAstrometricSolution(copyWin);
            }
            copyWin.forceClose();
      }
      if (!solved && this.par.target_interactivesolve.val) {
            do {
                  solved = this.runImageSolverEx(id, true, true, 1);
                  if (!solved) {
                        var txt = "ImageSolver failed. Do you want to retry?";
                        var response = new MessageBox(txt, "AutoIntegrate", StdIcon_Question, StdButton.Yes, StdButton.No ).execute();
                        if (response != StdButton.Yes) {
                              break;
                        }
                  }
            } while (!solved);
      }
      this.engine.engine_end_process(node);
      if (!solved) {
            this.engine.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            this.util.throwFatalError("ImageSolver failed on image " + id);
      }
}

} /* AutoIntegrateImageSolver */

#endif /* AUTOINTEGRATEIMAGESOLVER_JS */
