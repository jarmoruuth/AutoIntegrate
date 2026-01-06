// ****************************************************************************
// VeraLux — HyperMetric Stretch
// Photometric Hyperbolic Stretch Engine for PixInsight
//
// This version is converted from the original Python implementation,
// adapted for PixInsight JavaScript Runtime by Jarmo Ruuth using
// Claude AI (2025).
//
// All problems and bugs are likely due to the conversion process and
// not present in the original implementation.
//
// Original Python version Author: Riccardo Paterniti (2025)
// Original Python version contact: https://veralux.space/
// ****************************************************************************
//
// (c) 2025 Riccardo Paterniti
// VeraLux — HyperMetric Stretch
// SPDX-License-Identifier: GPL-3.0-or-later
// Version 1.3.0 (PixInsight JavaScript Port)
//
// Credits / Origin
// ----------------
//   • Original Python version implementation by Riccardo Paterniti (2025)
//   • Inspired by: The "True Color" methodology of Dr. Roger N. Clark
//   • Math basis: Inverse Hyperbolic Stretch (IHS) & Vector Color Preservation
//   • Sensor Science: Hardware-specific Quantum Efficiency weighting
//   • PixInsight port: Converted from Python/Siril implementation
//   • Python Source Repository: https://gitlab.com/free-astro/siril-scripts/-/blob/main/processing/VeraLux_HyperMetric_Stretch.py?ref_type=heads
//
// ****************************************************************************
//
// Overview
// --------
// A precision linear-to-nonlinear stretching engine designed to maximize sensor
// fidelity while managing the transition to the visible domain.
//
// HyperMetric Stretch (HMS) operates on a fundamental axiom: standard histogram
// transformations often destroy the photometric relationships between color channels
// (hue shifts) and clip high-dynamic range data. HMS solves this by decoupling
// Luminance geometry from Chromatic vectors.
//
// ****************************************************************************

// =============================================================================
//  SENSOR PROFILES DATABASE (v2.1 - Siril SPCC Derived)
// =============================================================================

#ifndef AUTOINTEGRATEVERALUXHMS_JS
#define AUTOINTEGRATEVERALUXHMS_JS

#define VERALUX_VERSION "1.3.0"

function AutoIntegrateVeraLuxHMS()
{

this.__base__ = Object;
this.__base__();

var SENSOR_PROFILES = {
   // --- STANDARD ---
   "Rec.709 (Recommended)": {
      weights: [0.2126, 0.7152, 0.0722],
      description: "ITU-R BT.709 standard for sRGB/HDTV",
      info: "Default choice. Best for general use, DSLR and unknown sensors.",
      category: 'standard'
   },

   // --- SONY MODERN BSI (Consumer) ---
   "Sony IMX571 (ASI2600/QHY268)": {
      weights: [0.2944, 0.5021, 0.2035],
      description: "Sony IMX571 26MP APS-C BSI (STARVIS)",
      info: "Gold standard APS-C. Excellent balance for broadband.",
      category: 'sensor-specific'
   },

   "Sony IMX533 (ASI533)": {
      weights: [0.2910, 0.5072, 0.2018],
      description: "Sony IMX533 9MP 1\" Square BSI (STARVIS)",
      info: "Popular square format. Very low noise.",
      category: 'sensor-specific'
   },

   "Sony IMX455 (ASI6200/QHY600)": {
      weights: [0.2987, 0.5001, 0.2013],
      description: "Sony IMX455 61MP Full Frame BSI (STARVIS)",
      info: "Full frame reference sensor.",
      category: 'sensor-specific'
   },

   "Sony IMX294 (ASI294)": {
      weights: [0.3068, 0.5008, 0.1925],
      description: "Sony IMX294 11.7MP 4/3\" BSI",
      info: "High sensitivity 4/3 format.",
      category: 'sensor-specific'
   },

   "Sony IMX183 (ASI183)": {
      weights: [0.2967, 0.4983, 0.2050],
      description: "Sony IMX183 20MP 1\" BSI",
      info: "High resolution 1-inch sensor.",
      category: 'sensor-specific'
   },

   "Sony IMX178 (ASI178)": {
      weights: [0.2346, 0.5206, 0.2448],
      description: "Sony IMX178 6.4MP 1/1.8\" BSI",
      info: "High resolution entry-level sensor.",
      category: 'sensor-specific'
   },

   "Sony IMX224 (ASI224)": {
      weights: [0.3402, 0.4765, 0.1833],
      description: "Sony IMX224 1.27MP 1/3\" BSI",
      info: "Classic planetary sensor. High Red response.",
      category: 'sensor-specific'
   },

   // --- SONY STARVIS 2 (NIR Optimized) ---
   "Sony IMX585 (ASI585) - STARVIS 2": {
      weights: [0.3431, 0.4822, 0.1747],
      description: "Sony IMX585 8.3MP 1/1.2\" BSI (STARVIS 2)",
      info: "NIR optimized. Excellent for H-Alpha/Narrowband.",
      category: 'sensor-specific'
   },

   "Sony IMX662 (ASI662) - STARVIS 2": {
      weights: [0.3430, 0.4821, 0.1749],
      description: "Sony IMX662 2.1MP 1/2.8\" BSI (STARVIS 2)",
      info: "Planetary/Guiding. High Red/NIR sensitivity.",
      category: 'sensor-specific'
   },

   "Sony IMX678/715 - STARVIS 2": {
      weights: [0.3426, 0.4825, 0.1750],
      description: "Sony IMX678/715 BSI (STARVIS 2)",
      info: "High resolution planetary/security sensors.",
      category: 'sensor-specific'
   },

   // --- PANASONIC / OTHERS ---
   "Panasonic MN34230 (ASI1600/QHY163)": {
      weights: [0.2650, 0.5250, 0.2100],
      description: "Panasonic MN34230 4/3\" CMOS",
      info: "Classic Mono/OSC sensor. Optimized weights.",
      category: 'sensor-specific'
   },

   // --- CANON DSLR ---
   "Canon EOS (Modern - 60D/6D/R)": {
      weights: [0.2550, 0.5250, 0.2200],
      description: "Canon CMOS Profile (Modern)",
      info: "Balanced profile for most Canon EOS cameras.",
      category: 'sensor-specific'
   },

   "Canon EOS (Legacy - 300D/40D)": {
      weights: [0.2400, 0.5400, 0.2200],
      description: "Canon CMOS Profile (Legacy)",
      info: "For older Canon models (Digic 2/3 era).",
      category: 'sensor-specific'
   },

   // --- NIKON DSLR ---
   "Nikon DSLR (Modern - D5300/D850)": {
      weights: [0.2600, 0.5100, 0.2300],
      description: "Nikon CMOS Profile (Modern)",
      info: "Balanced profile for Nikon Expeed 4+ cameras.",
      category: 'sensor-specific'
   },

   // --- SMART TELESCOPES ---
   "ZWO Seestar S50": {
      weights: [0.3333, 0.4866, 0.1801],
      description: "ZWO Seestar S50 (IMX462)",
      info: "Specific profile for Seestar S50 smart telescope.",
      category: 'sensor-specific'
   },

   "ZWO Seestar S30": {
      weights: [0.2928, 0.5053, 0.2019],
      description: "ZWO Seestar S30",
      info: "Specific profile for Seestar S30 smart telescope.",
      category: 'sensor-specific'
   },

   // --- NARROWBAND ---
   "Narrowband HOO": {
      weights: [0.5000, 0.2500, 0.2500],
      description: "Bicolor palette: Ha=Red, OIII=Green+Blue",
      info: "Balanced weighting for HOO synthetic palette processing.",
      category: 'narrowband'
   },

   "Narrowband SHO": {
      weights: [0.3333, 0.3400, 0.3267],
      description: "Hubble palette: SII=Red, Ha=Green, OIII=Blue",
      info: "Nearly uniform weighting for SHO tricolor narrowband.",
      category: 'narrowband'
   },
   "Narrowband Tricolor": {
      weights: [0.3333, 0.3333, 0.3333],
      description: "Generic Tricolor palette: Ha, SII, OIII",
      info: "Uniform weighting for SHO tricolor narrowband.",
      category: 'narrowband'
   }
};

var DEFAULT_PROFILE = "Rec.709 (Recommended)";

// Get a list of available sensor profiles
function getSensorProfileNames(add_default = false) {
    var profiles = [];
    if (add_default) {
      profiles.push('Default');
    }
    for (var key in SENSOR_PROFILES) {
        profiles.push(key);
    }
    return profiles;
}

function getSensorProfiles() {
   return SENSOR_PROFILES;
}

// =============================================================================
//  CORE ENGINE - VeraLuxCore (Single Source of Truth)
// =============================================================================

function VeraLuxCore() {}

// Percentile function with linear interpolation
VeraLuxCore.percentile = function(array, p) {
   if (!array || array.length === 0) {
      throw new Error("Array cannot be empty");
   }
   if (p < 0 || p > 100) {
      throw new Error("Percentile must be between 0 and 100");
   }
   
   var sorted = array.slice();
   sorted.sort(function(a, b) { return a - b; });
   
   var index = (p / 100) * (sorted.length - 1);
   var lower = Math.floor(index);
   var upper = Math.ceil(index);
   var weight = index - lower;
   
   if (lower === upper) {
      return sorted[lower];
   }
   return sorted[lower] * (1 - weight) + sorted[upper] * weight;
};

// Sample pixels from image using adaptive strategy
VeraLuxCore.samplePixels = function(img, channel, maxSamples) {
   var width = img.width;
   var height = img.height;
   var totalPixels = width * height;
   
   // If image is small enough, use all pixels
   if (totalPixels <= maxSamples) {
      var pixels = [];
      for (var y = 0; y < height; y++) {
         for (var x = 0; x < width; x++) {
            pixels.push(img.sample(x, y, channel));
         }
      }
      return pixels;
   }
   
   // For large images, use systematic sampling
   var stepSize = Math.sqrt(totalPixels / maxSamples);
   var pixels = [];
   
   for (var y = 0; y < height; y += stepSize) {
      for (var x = 0; x < width; x += stepSize) {
         var sx = Math.floor(x);
         var sy = Math.floor(y);
         if (sx < width && sy < height) {
            pixels.push(img.sample(sx, sy, channel));
         }
      }
   }
   
   return pixels;
};

// Calculate statistical anchor (black point)
VeraLuxCore.calculateAnchor = function(image, weights) {
   var isColor = image.numberOfChannels >= 3;
   var maxSamples = 1000000;

   if (isColor) {
      var floors = [];
      for (var c = 0; c < 3; c++) {
         // Sample pixels and calculate 0.5th percentile
         var samples = VeraLuxCore.samplePixels(image, c, maxSamples);
         var pctile = VeraLuxCore.percentile(samples, 0.5);
         floors.push(pctile);
      }
      var anchor = Math.max(0.0, Math.min(floors[0], floors[1], floors[2]) - 0.00025);
      return anchor;
   } else {
      var samples = VeraLuxCore.samplePixels(image, 0, maxSamples);
      var floor = VeraLuxCore.percentile(samples, 0.5);
      return Math.max(0.0, floor - 0.00025);
   }
};

// Calculate adaptive anchor using histogram morphology
VeraLuxCore.calculateAnchorAdaptive = function(image, weights) {
   var isColor = image.numberOfChannels >= 3;
   var luminanceImage;
   var maxSamples = 1000000;

   if (isColor) {
      // Create a temporary image for luminance calculation
      luminanceImage = new Image(image.width, image.height, 1, ColorSpace_Gray, 32, SampleType_Real);

      var r_w = weights[0];
      var g_w = weights[1];
      var b_w = weights[2];

      for (var y = 0; y < image.height; y++) {
         for (var x = 0; x < image.width; x++) {
            var r = image.sample(x, y, 0);
            var g = image.sample(x, y, 1);
            var b = image.sample(x, y, 2);
            var L = r_w * r + g_w * g + b_w * b;
            luminanceImage.setSample(L, x, y, 0);
         }
      }
   } else {
      luminanceImage = image;
   }

   // Sample pixels and calculate percentile
   var samples = VeraLuxCore.samplePixels(luminanceImage, 0, maxSamples);
   var floor = VeraLuxCore.percentile(samples, 0.5);
   
   // Clean up temporary image if created
   if (isColor && luminanceImage) {
      luminanceImage.free();
   }
   
   return Math.max(0.0, floor - 0.00025);
};

// Extract luminance from image
VeraLuxCore.extractLuminance = function(image, anchor, weights) {
   var isColor = image.numberOfChannels >= 3;
   var width = image.width;
   var height = image.height;

   // Create output luminance image
   var luminance = new Image(width, height, 1, ColorSpace_Gray, 32, SampleType_Real);

   if (isColor) {
      var r_w = weights[0];
      var g_w = weights[1];
      var b_w = weights[2];

      for (var y = 0; y < height; y++) {
         for (var x = 0; x < width; x++) {
            var r = Math.max(0, image.sample(x, y, 0) - anchor);
            var g = Math.max(0, image.sample(x, y, 1) - anchor);
            var b = Math.max(0, image.sample(x, y, 2) - anchor);
            var L = r_w * r + g_w * g + b_w * b;
            luminance.setSample(L, x, y, 0);
         }
      }
   } else {
      for (var y = 0; y < height; y++) {
         for (var x = 0; x < width; x++) {
            var val = Math.max(0, image.sample(x, y, 0) - anchor);
            luminance.setSample(val, x, y, 0);
         }
      }
   }

   return luminance;
};

// Hyperbolic stretch function
VeraLuxCore.hyperbolicStretch = function(value, D, b, SP) {
   if (SP === undefined) SP = 0.0;
   D = Math.max(D, 0.1);
   b = Math.max(b, 0.1);

   var term1 = Math.asinh(D * (value - SP) + b);
   var term2 = Math.asinh(b);
   var normFactor = Math.asinh(D * (1.0 - SP) + b) - term2;

   if (normFactor === 0) normFactor = 1e-6;

   return (term1 - term2) / normFactor;
};

// Solve for optimal Log D given target median
VeraLuxCore.solveLogD = function(image, targetMedian, bVal, weights, useAdaptive) {
   // Get anchor
   var anchor;
   if (useAdaptive) {
      anchor = VeraLuxCore.calculateAnchorAdaptive(image, weights);
   } else {
      anchor = VeraLuxCore.calculateAnchor(image, weights);
   }

   // Calculate luminance median after anchoring
   var isColor = image.numberOfChannels >= 3;
   var medianIn;

   if (isColor) {
      var r_w = weights[0];
      var g_w = weights[1];
      var b_w = weights[2];

      // Sample pixels for median calculation
      var sampleSize = Math.min(100000, image.width * image.height);
      var stride = Math.max(1, Math.floor(image.width * image.height / sampleSize));
      var samples = [];

      for (var i = 0; i < image.width * image.height; i += stride) {
         var x = i % image.width;
         var y = Math.floor(i / image.width);
         var r = Math.max(0, image.sample(x, y, 0) - anchor);
         var g = Math.max(0, image.sample(x, y, 1) - anchor);
         var b = Math.max(0, image.sample(x, y, 2) - anchor);
         var L = r_w * r + g_w * g + b_w * b;
         if (L > 1e-7) samples.push(L);
      }

      samples.sort(function(a, b) { return a - b; });
      medianIn = samples.length > 0 ? samples[Math.floor(samples.length / 2)] : 0;
   } else {
      medianIn = Math.max(0, image.median() - anchor);
   }

   if (medianIn < 1e-9) {
        console.writeln("VeraLux: Median input luminance is too low, defaulting Log D to 2.0");
        return 2.0;
   }

   // Binary search for optimal Log D
   var lowLog = 0.0;
   var highLog = 7.0;
   var bestLogD = 2.0;

   for (var iter = 0; iter < 40; iter++) {
      var midLog = (lowLog + highLog) / 2.0;
      var midD = Math.pow(10, midLog);
      var testVal = VeraLuxCore.hyperbolicStretch(medianIn, midD, bVal);

      if (Math.abs(testVal - targetMedian) < 0.0001) {
         bestLogD = midLog;
         break;
      }

      if (testVal < targetMedian) {
         lowLog = midLog;
      } else {
         highLog = midLog;
      }
      bestLogD = midLog;
   }

   console.writeln(format("VeraLux: Solved Log D = %.4f (Median In: %.6f)", bestLogD, medianIn));

   return bestLogD;
};

// Apply MTF (Midtone Transfer Function)
VeraLuxCore.applyMTF = function(value, m) {
   var term1 = (m - 1.0) * value;
   var term2 = (2.0 * m - 1.0) * value - m;

   if (Math.abs(term2) < 1e-9) return value;

   var result = term1 / term2;
   return Math.max(0, Math.min(1, result));
};

// =============================================================================
//  PROCESSING FUNCTIONS
// =============================================================================

function adaptiveOutputScaling(image, weights, targetBg, progressCallback) {
   if (progressCallback) progressCallback("Adaptive Scaling: Analyzing Dynamic Range...");

   var isColor = image.numberOfChannels >= 3;
   var width = image.width;
   var height = image.height;

   var r_w = weights[0];
   var g_w = weights[1];
   var b_w = weights[2];

   // Calculate luminance statistics
   var samples = [];
   var sampleSize = Math.min(500000, width * height);
   var stride = Math.max(1, Math.floor(width * height / sampleSize));

   for (var i = 0; i < width * height; i += stride) {
      var x = i % width;
      var y = Math.floor(i / width);

      var L;
      if (isColor) {
         var r = image.sample(x, y, 0);
         var g = image.sample(x, y, 1);
         var b = image.sample(x, y, 2);
         L = r_w * r + g_w * g + b_w * b;
      } else {
         L = image.sample(x, y, 0);
      }
      samples.push(L);
   }

   samples.sort(function(a, b) { return a - b; });

   var medianL = samples[Math.floor(samples.length / 2)];

   // Calculate standard deviation
   var sum = 0;
   for (var i = 0; i < samples.length; i++) sum += samples[i];
   var mean = sum / samples.length;

   var sqDiffSum = 0;
   for (var i = 0; i < samples.length; i++) {
      var diff = samples[i] - mean;
      sqDiffSum += diff * diff;
   }
   var stdL = Math.sqrt(sqDiffSum / samples.length);

   var minL = samples[0];
   var globalFloor = Math.max(minL, medianL - 2.7 * stdL);
   var PEDESTAL = 0.001;

   // Get ceiling values (percentiles)
   var softCeilIdx = Math.floor(samples.length * 0.99);
   var hardCeilIdx = Math.floor(samples.length * 0.9999);
   var softCeil = samples[softCeilIdx];
   var hardCeil = samples[hardCeilIdx];

   if (softCeil <= globalFloor) softCeil = globalFloor + 1e-6;
   if (hardCeil <= softCeil) hardCeil = softCeil + 1e-6;

   var scaleContrast = (0.98 - PEDESTAL) / (softCeil - globalFloor + 1e-9);
   var scaleSafety = (1.0 - PEDESTAL) / (hardCeil - globalFloor + 1e-9);
   var finalScale = Math.min(scaleContrast, scaleSafety);

   // Apply scaling
   var numChannels = isColor ? 3 : 1;
   for (var c = 0; c < numChannels; c++) {
      for (var y = 0; y < height; y++) {
         for (var x = 0; x < width; x++) {
            var val = image.sample(x, y, c);
            val = Math.max(0, Math.min(1, (val - globalFloor) * finalScale + PEDESTAL));
            image.setSample(val, x, y, c);
         }
      }
   }

   // Calculate current background and apply MTF if needed
   samples = [];
   for (var i = 0; i < width * height; i += stride) {
      var x = i % width;
      var y = Math.floor(i / width);

      var L;
      if (isColor) {
         var r = image.sample(x, y, 0);
         var g = image.sample(x, y, 1);
         var b = image.sample(x, y, 2);
         L = r_w * r + g_w * g + b_w * b;
      } else {
         L = image.sample(x, y, 0);
      }
      samples.push(L);
   }

   samples.sort(function(a, b) { return a - b; });
   var currentBg = samples[Math.floor(samples.length / 2)];

   if (currentBg > 0.0 && currentBg < 1.0 && Math.abs(currentBg - targetBg) > 1e-3) {
      if (progressCallback) progressCallback(format("Applying MTF (Bg: %.3f -> %.2f)", currentBg, targetBg));

      var m = (currentBg * (targetBg - 1.0)) / (currentBg * (2.0 * targetBg - 1.0) - targetBg);

      for (var c = 0; c < numChannels; c++) {
         for (var y = 0; y < height; y++) {
            for (var x = 0; x < width; x++) {
               var val = image.sample(x, y, c);
               val = VeraLuxCore.applyMTF(val, m);
               image.setSample(val, x, y, c);
            }
         }
      }
   }
}

function applySoftClip(image, threshold, rolloff, progressCallback) {
   if (progressCallback) progressCallback(format("Final Polish: Soft-clip > %.2f", threshold));

   var numChannels = image.numberOfChannels;
   var width = image.width;
   var height = image.height;

   for (var c = 0; c < numChannels; c++) {
      for (var y = 0; y < height; y++) {
         for (var x = 0; x < width; x++) {
            var val = image.sample(x, y, c);

            if (val > threshold) {
               var t = Math.max(0, Math.min(1, (val - threshold) / (1.0 - threshold + 1e-9)));
               val = threshold + (1.0 - threshold) * (1.0 - Math.pow(1.0 - t, rolloff));
            }

            image.setSample(Math.max(0, Math.min(1, val)), x, y, c);
         }
      }
   }
}

// Main processing function
function processVeraLux(targetView, params, progressCallback) {
   var image = targetView.image;
   var isColor = image.numberOfChannels >= 3;
   var width = image.width;
   var height = image.height;

   var weights = SENSOR_PROFILES[params.sensorProfile].weights;

   // Calculate anchor
   if (progressCallback) progressCallback("Calculating Anchor...");

   var anchor;
   if (params.useAdaptiveAnchor) {
      anchor = VeraLuxCore.calculateAnchorAdaptive(image, weights);
   } else {
      anchor = VeraLuxCore.calculateAnchor(image, weights);
   }

   console.writeln(format("VeraLux: Anchor = %.6f", anchor));

   // Extract ratios and apply stretch
   if (progressCallback) progressCallback(format("Stretching (Log D=%.2f)...", params.logD));

   var D = Math.pow(10, params.logD);
   var r_w = weights[0];
   var g_w = weights[1];
   var b_w = weights[2];

   if (isColor) {
      for (var y = 0; y < height; y++) {
         if (y % 100 === 0 && progressCallback) {
            progressCallback(format("Processing row %d of %d...", y, height));
         }

         for (var x = 0; x < width; x++) {
            // Get anchored values
            var r = Math.max(0, image.sample(x, y, 0) - anchor);
            var g = Math.max(0, image.sample(x, y, 1) - anchor);
            var b = Math.max(0, image.sample(x, y, 2) - anchor);

            // Calculate luminance
            var L = r_w * r + g_w * g + b_w * b;
            var epsilon = 1e-9;
            var L_safe = L + epsilon;

            // Calculate color ratios
            var r_ratio = r / L_safe;
            var g_ratio = g / L_safe;
            var b_ratio = b / L_safe;

            // Stretch luminance
            var L_str = VeraLuxCore.hyperbolicStretch(L, D, params.protectB);
            L_str = Math.max(0, Math.min(1, L_str));

            // Color convergence (star core recovery)
            var k = Math.pow(L_str, params.convergencePower);
            var r_final = r_ratio * (1.0 - k) + 1.0 * k;
            var g_final = g_ratio * (1.0 - k) + 1.0 * k;
            var b_final = b_ratio * (1.0 - k) + 1.0 * k;

            // Apply color grip and shadow convergence
            var needsHybrid = (params.colorGrip < 1.0) || (params.shadowConvergence > 0.01);

            var rOut = L_str * r_final;
            var gOut = L_str * g_final;
            var bOut = L_str * b_final;

            if (needsHybrid) {
               // Scalar stretch
               var r_scalar = VeraLuxCore.hyperbolicStretch(r, D, params.protectB);
               var g_scalar = VeraLuxCore.hyperbolicStretch(g, D, params.protectB);
               var b_scalar = VeraLuxCore.hyperbolicStretch(b, D, params.protectB);

               r_scalar = Math.max(0, Math.min(1, r_scalar));
               g_scalar = Math.max(0, Math.min(1, g_scalar));
               b_scalar = Math.max(0, Math.min(1, b_scalar));

               var gripMap = params.colorGrip;

               if (params.shadowConvergence > 0.01) {
                  var damping = Math.pow(L_str, params.shadowConvergence);
                  gripMap = gripMap * damping;
               }

               rOut = rOut * gripMap + r_scalar * (1.0 - gripMap);
               gOut = gOut * gripMap + g_scalar * (1.0 - gripMap);
               bOut = bOut * gripMap + b_scalar * (1.0 - gripMap);
            }

            // Add pedestal
            rOut = rOut * (1.0 - 0.005) + 0.005;
            gOut = gOut * (1.0 - 0.005) + 0.005;
            bOut = bOut * (1.0 - 0.005) + 0.005;

            image.setSample(Math.max(0, Math.min(1, rOut)), x, y, 0);
            image.setSample(Math.max(0, Math.min(1, gOut)), x, y, 1);
            image.setSample(Math.max(0, Math.min(1, bOut)), x, y, 2);
         }
      }
   } else {
      // Mono image
      for (var y = 0; y < height; y++) {
         if (y % 100 === 0 && progressCallback) {
            progressCallback(format("Processing row %d of %d...", y, height));
         }

         for (var x = 0; x < width; x++) {
            var val = Math.max(0, image.sample(x, y, 0) - anchor);
            var L_str = VeraLuxCore.hyperbolicStretch(val, D, params.protectB);
            L_str = L_str * (1.0 - 0.005) + 0.005;
            image.setSample(Math.max(0, Math.min(1, L_str)), x, y, 0);
         }
      }
   }

   // Ready-to-use mode post-processing
   if (params.processingMode === "Ready-to-Use") {
      adaptiveOutputScaling(image, weights, params.targetBg, progressCallback);
      applySoftClip(image, 0.98, 2.0, progressCallback);
   }

   if (progressCallback) progressCallback("Complete.");
}

// =============================================================================
//  PARAMETERS
// =============================================================================

function VeraLuxParameters() {
   this.sensorProfile = DEFAULT_PROFILE;
   this.processingMode = "Ready-to-Use";  // "Ready-to-Use" or "scientific"
   this.targetBg = 0.20;
   this.logD = 2.0;
   this.protectB = 6.0;
   this.convergencePower = 3.5;
   this.colorGrip = 1.0;
   this.shadowConvergence = 0.0;
   this.useAutoD = false;
   this.useAdaptiveAnchor = true;
   this.colorStrategy = 0;  // -100 to +100 for unified control

   this.reset = function() {
      this.sensorProfile = DEFAULT_PROFILE;
      this.processingMode = "Ready-to-Use";
      this.targetBg = 0.20;
      this.logD = 2.0;
      this.protectB = 6.0;
      this.convergencePower = 3.5;
      this.colorGrip = 1.0;
      this.shadowConvergence = 0.0;
      this.useAdaptiveAnchor = true;
      this.colorStrategy = 0;
   };

   // Calculate effective grip and shadow from unified control
   this.getEffectiveParams = function() {
      if (this.processingMode === "Ready-to-Use") {
         var val = this.colorStrategy;
         if (val < 0) {
            // Left: Increase Shadow Convergence
            return {
               grip: 1.0,
               shadow: (Math.abs(val) / 100.0) * 3.0
            };
         } else {
            // Right: Decrease Color Grip
            return {
               grip: 1.0 - ((val / 100.0) * 0.6),
               shadow: 0.0
            };
         }
      } else {
         return {
            grip: this.colorGrip,
            shadow: this.shadowConvergence
         };
      }
   };
}

var parameters = new VeraLuxParameters();

// =============================================================================
//  AUTOMATION INTERFACE
// =============================================================================

function executeVeraLux(window, global = null, util = null) {

    var view = window.currentView;
    var image = view.image;

    if (image.numberOfChannels < 1) {
         if (util) {
            util.throwFatalError("Error: No image data found in the current view.");
         } else {
            console.criticalln("Error: No image data found in the current view.");
         }
        return;
    }

    // Get effective parameters { grip: _, shadow: _ }
    var effectiveParams = parameters.getEffectiveParams();

    if (parameters.useAutoD) {
         console.writeln("VeraLux: Auto Log D enabled. Solving optimal Log D...");
         var weights = SENSOR_PROFILES[parameters.sensorProfile].weights;
         var logD = VeraLuxCore.solveLogD(
                     view.image,
                     parameters.targetBg,
                     parameters.protectB,
                     weights,
                     parameters.useAdaptiveAnchor
         );
         if (global.veraluxAutoCalcDLabel != null) {
            global.veraluxAutoCalcDLabel.text = "(" + format("%.2f", logD) + ")";
         }
   } else {
         var logD = parameters.logD;
   }

    var procParams = {
        sensorProfile: parameters.sensorProfile,
        processingMode: parameters.processingMode,
        targetBg: parameters.targetBg,
        logD: logD,
        protectB: parameters.protectB,
        convergencePower: parameters.convergencePower,
        colorGrip: effectiveParams.grip,
        shadowConvergence: effectiveParams.shadow,
        useAdaptiveAnchor: parameters.useAdaptiveAnchor
    };

   console.writeln("Processing Parameters:");
   console.writeln(format("  Sensor Profile: %s", procParams.sensorProfile));
   console.writeln(format("  Processing Mode: %s", procParams.processingMode));
   console.writeln(format("  Target Background: %.2f", procParams.targetBg));
   console.writeln(format("  Log D: %.2f", procParams.logD));
   console.writeln(format("  Protect b: %.2f", procParams.protectB));
   console.writeln(format("  Convergence Power: %.2f", procParams.convergencePower));
   console.writeln(format("  Color Grip: %.2f", procParams.colorGrip));
   console.writeln(format("  Shadow Convergence: %.2f", procParams.shadowConvergence));
   console.writeln(format("  Use Adaptive Anchor: %s", procParams.useAdaptiveAnchor ? "Yes" : "No"));

    console.writeln("Processing...");

    console.writeln("");
    console.writeln("##############################################");
    console.writeln("# VeraLux — HyperMetric Stretch v" + VERALUX_VERSION);
    console.writeln("##############################################");
    console.writeln(format("Mode: %s", procParams.processingMode === "Ready-to-Use" ? "Ready-to-Use" : "Scientific"));
    console.writeln(format("Sensor: %s", procParams.sensorProfile));
    console.writeln(format("Log D: %.2f | Protect b: %.1f", procParams.logD, procParams.protectB));
    console.writeln(format("Color Grip: %.2f | Shadow Conv: %.2f", procParams.colorGrip, procParams.shadowConvergence));
    console.writeln("");

    view.beginProcess(UndoFlag_PixelData);

    try {
        processVeraLux(view, procParams, function(msg) {
            console.writeln(msg);
            processEvents();
        });

        view.endProcess();
        console.writeln("");
        console.writeln("VeraLux: Processing complete.");
    } catch (error) {
        view.endProcess();
        if (util) {
            util.throwFatalError("VeraLux Error: " + error.message);
        } else {
            console.criticalln("VeraLux Error: " + error.message);
        }
    }
};

function getHelpText() {
    var helptext= [];
    helptext.push("==========================================================================");
    helptext.push("   VERALUX HYPERMETRIC STRETCH v" + VERALUX_VERSION + " - OPERATIONAL GUIDE");
    helptext.push("==========================================================================");
    helptext.push("");
    helptext.push("OVERVIEW");
    helptext.push("-----------------");
    helptext.push("VeraLux provides a mathematically precise linear-to-nonlinear stretch");
    helptext.push("that preserves photometric color ratios (Vector Color) often destroyed");
    helptext.push("by standard histogram transformations (Hue Shift).");
    helptext.push("");
    helptext.push("[1] CRITICAL PREREQUISITES");
    helptext.push("    • Input MUST be Linear (not yet stretched).");
    helptext.push("    • Background gradients must have been removed.");
    helptext.push("    • RGB input must be Color Calibrated (SPCC).");
    helptext.push("");
    helptext.push("[2] PROCESSING MODES");
    helptext.push("    A. Ready-to-Use: Aesthetic output with adaptive expansion.");
    helptext.push("    B. Scientific: 100% mathematically consistent for manual work.");
    helptext.push("");
    helptext.push("[3] COLOR STRATEGY (Ready-to-Use Mode)");
    helptext.push("    • CENTER (0): Pure VeraLux vector color fidelity.");
    helptext.push("    • LEFT (<0): Suppresses background color noise.");
    helptext.push("    • RIGHT (>0): Softens highlights/star cores.");
    helptext.push("");
    helptext.push("[4] KEY PARAMETERS");
    helptext.push("    • Log D: Stretch intensity (higher = brighter), default is Auto.");
    helptext.push("    • Protect b: Highlight protection knee.");
    helptext.push("    • Star Core Recovery: Color-to-white transition speed.");
    helptext.push("");
    helptext.push("(c) 2025 Riccardo Paterniti");
    helptext.push("This version is converted from the original Python implementation.");
    helptext.push("Original Python version contact: https://veralux.space/");
    helptext.push("==========================================================================");
    return helptext.join("\n");
};

this.executeVeraLux = executeVeraLux;
this.parameters = parameters;
this.getSensorProfileNames = getSensorProfileNames;
this.getSensorProfiles = getSensorProfiles;
this.getHelpText = getHelpText;

this.VeraLuxCore = VeraLuxCore;
this.processVeraLux = processVeraLux;

} // AutoIntegrateVeraLuxHMS

AutoIntegrateVeraLuxHMS.prototype = new Object;

#endif // AUTOINTEGRATEVERALUXHMS_JS
