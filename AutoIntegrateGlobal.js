/*
    AutoIntegrate Global variables.

Copyright (c) 2018-2025 Jarmo Ruuth.

Crop to common area code

      Copyright (c) 2022 Jean-Marc Lugrin.

Window name prefix and icon location code

      Copyright (c) 2021 rob pfile.

This product is based on software from the PixInsight project, developed
by Pleiades Astrophoto and its contributors (https://pixinsight.com/).

*/

#include <pjsr/ColorSpace.jsh>
#include <pjsr/UndoFlag.jsh>
#include <pjsr/DataType.jsh>

#define SETTINGSKEY "AutoIntegrate"

/*
 * Default STF Parameters
 */

// Shadows clipping point in (normalized) MAD units from the median.
#define DEFAULT_AUTOSTRETCH_SCLIP  -2.80
// Target mean background in the [0,1] range.
#define DEFAULT_AUTOSTRETCH_TBGND   0.25
// Apply the same STF to all nominal channels (true), or treat each channel
// separately (false).
#define DEFAULT_AUTOSTRETCH_CLINK   true

function AutoIntegrateGlobal()
{

this.__base__ = Object;
this.__base__();

/* Following variables are AUTOMATICALLY PROCESSED so do not change format.
 */
this.autointegrate_version = "AutoIntegrate v1.81 test3";   // Version, also updated into updates.xri
this.autointegrate_info = "VeraLux HyperMetric Stretch";    // For updates.xri

this.autointegrate_version_info = [
      "Changes since the previous version:",
      "- Added VeraLux HyperMetric Stretch (HMS) as a new stretch option.",
];

this.pixinsight_version_str = "";   // PixInsight version string, e.g. 1.8.8.10
this.pixinsight_version_num = 0;    // PixInsight version number, e.h. 1080810
this.pixinsight_build_num = 0;      // PixInsight build number, e.g. 1601

this.interactiveMode = true;        // true if running in interactive mode
this.processingDate = null;

this.processing_state = {
      none: 0,
      processing: 1,
      extra_processing: 2
}

// GUI variables
this.tabStatusInfoLabel = null;         // For update processing status
this.sideStatusInfoLabel = null;        // For update processing status
this.sectionBarControls = [];
this.sectionBars = [];


this.do_not_read_settings = false;      // do not read Settings from persistent module settings
this.do_not_write_settings = false;     // do not write Settings to persistent module settings
this.use_preview = true;
this.is_processing = this.processing_state.none;

this.cancel_processing = false;

this.LDDDefectInfo = [];                // { groupname: name,  defects: defects }

// Set parameter value and check possible mappings
this.setParameterValue = function(param, val) {
      if (param.name == "Target type") {
            if (val == "Small bright nebula" || val == "Large nebula") {
                  param.val = "Nebula";
                  return;
            }
      }
      param.val = val;
};

/*
      Parameters that can be adjusted in the GUI
      These can be saved to persistent module settings or 
      process icon and later restored.
      Note that there is another parameter set ppar which are
      saved only to persistent module settings.
      For reset, we need to keep track of GUI element where
      these values are used. Fields where values are stored
      are: .currentItem, .checked, .editText, .setValue, .value
*/
this.par = {
      // Image processing parameters
      local_normalization: { val: false, def: false, name : "Local normalization", type : 'B' },
      fix_column_defects: { val: false, def: false, name : "Fix column defects", type : 'B' },
      fix_row_defects: { val: false, def: false, name : "Fix row defects", type : 'B' },
      skip_cosmeticcorrection: { val: false, def: false, name : "No Cosmetic correction", type : 'B', oldname: "Cosmetic correction" },
      skip_subframeselector: { val: false, def: false, name : "No SubframeSelector", type : 'B', oldname : "SubframeSelector" },
      strict_StarAlign: { val: false, def: false, name : "Strict StarAlign", type : 'B' },
      staralignment_sensitivity: { val: 0.5, def: 0.5, name : "StarAlignment sensitivity", type : 'R' },
      staralignment_maxstarsdistortion: { val: 0.6, def: 0.6, name : "StarAlignment distortion", type : 'R' },
      staralignment_structurelayers: { val: 5, def: 5, name : "StarAlignment layers", type : 'I' },
      staralignment_noisereductionfilterradius: { val: 0, def: 0, name : "StarAlignment noise reduction", type : 'I' },
      comet_align: { val: false, def: false, name : "Comet align", type : 'B' },
      comet_first_xy: { val: '', def: '', name : "Comet align first XY", type : 'S' },
      comet_last_xy: { val: '', def: '', name : "Comet align last XY", type : 'S' },
      binning: { val: 0, def: 0, name : "Binning", type : 'I' },
      binning_resample: { val: 2, def: 2, name : "Binning resample factor", type : 'I' },
      GC_before_channel_combination: { val: false, def: false, name : "GC before channel combination", type : 'B', oldname: "ABE before channel combination" },
      GC_on_lights: { val: false, def: false, name : "GC on light images", type : 'B', oldname: "ABE on light images" },
      use_GC_on_L_RGB: { val: false, def: false, name : "Use GC on L, RGB", type : 'B', oldname: "Use ABE on L, RGB" },
      use_GC_on_L_RGB_stretched: { val: false, def: false, name : "Use GC on L, RGB stretched", type : 'B', oldname: "Use ABE on L, RGB stretched" },
      use_graxpert: { val: false, def: false, name : "Use GraXpert", type : 'B' },
      use_graxpert_denoise: { val: false, def: false, name : "Use GraXpert denoise", type : 'B' },
      use_graxpert_deconvolution: { val: false, def: false, name : "Use GraXpert deconvolution", type : 'B' },
      use_abe: { val: false, def: false, name : "Use AutomaticBackgroundExtractor", type : 'B' },
      use_dbe: { val: false, def: false, name : "Use DynamicBackgroundExtractor", type : 'B' },
      use_multiscalegradientcorrection: { val: false, def: false, name : "Use MultiscaleGradientCorrection", type : 'B' },
      skip_color_calibration: { val: false, def: false, name : "No color calibration", type : 'B' },
      skip_auto_background: { val: false, def: false, name : "No auto background", type : 'B' },
      use_spcc: { val: false, def: false, name : "Use SPCC for color calibration", type : 'B' },
      solve_image: { val: false, def: false, name : "Solve image", type : 'B' },
      use_background_neutralization: { val: false, def: false, name : "Background neutralization", type : 'B' },
      use_fastintegration: { val: false, def: false, name : "Use FastIntegration", type : 'B' },
      use_imageintegration_ssweight: { val: false, def: false, name : "ImageIntegration use SSWEIGHT", type : 'B' },
      skip_noise_reduction: { val: false, def: false, name : "No noise reduction", type : 'B' },
      skip_star_noise_reduction: { val: false, def: false, name : "No star noise reduction", type : 'B' },
      skip_mask_contrast: { val: false, def: false, name : "No mask contrast", type : 'B' },
      skip_sharpening: { val: false, def: false, name : "No sharpening", type : 'B' },
      skip_SCNR: { val: false, def: false, name : "No SCNR", type : 'B' },
      force_new_mask: { val: false, def: false, name : "Force new mask", type : 'B' },
      crop_to_common_area: { val: false, def: false, name : "Crop to common area", type : 'B' },
      unscreen_stars: { val: true, def: true, name : "Unscreen stars", type : 'B' },

      // Saving image
      save_final_image_tiff: { val: false, def: false, name : "Save final image as TIFF", type : 'B' },
      save_final_image_jpg: { val: false, def: false, name : "Save final image as JPG", type : 'B' },
      save_final_image_jpg_quality: { val: 80, def: 80, name : "Save final image as JPG quality", type : 'I' },

      // Other parameters
      calibrate_only: { val: false, def: false, name : "Calibrate only", type : 'B' },
      image_weight_testing: { val: false, def: false, name : "Image weight testing", type : 'B' },
      early_PSF_check: { val: false, def: false, name : "Early PSF check", type : 'B' },
      debayer_only: { val: false, def: false, name : "Debayer only", type : 'B' },
      binning_only: { val: false, def: false, name : "Binning only", type : 'B' },
      extract_channels_only: { val: false, def: false, name : "Extract channels only", type : 'B' },
      integrate_only: { val: false, def: false, name : "Integrate only", type : 'B' },
      channelcombination_only: { val: false, def: false, name : "ChannelCombination only", type : 'B' },
      cropinfo_only: { val: false, def: false, name : "Crop info only", type : 'B' },
      RRGB_image: { val: false, def: false, name : "RRGB", type : 'B' },
      batch_mode: { val: false, def: false, name : "Batch mode", type : 'B' },
      fast_mode: { val: false, def: false, name : "Fast mode", type : 'B' },
      fast_mode_opt: { val: 'S', def: 'S', name : "Fast mode opt", type : 'S' },
      substack_mode: { val: false, def: false, name : "Substack mode", type : 'B' },
      substack_count: { val: 10, def: 10, name : "Substack count", type : 'I' },
      skip_autodetect_filter: { val: false, def: false, name : "Do not autodetect FILTER keyword", type : 'B' },
      skip_autodetect_imagetyp: { val: false, def: false, name : "Do not autodetect IMAGETYP keyword", type : 'B' },
      select_all_files: { val: false, def: false, name : "Select all files", type : 'B' },
      save_all_files: { val: false, def: false, name : "Save all files", type : 'B' },
      save_processed_channel_images: { val: false, def: false, name : "Save processed channel images", type : 'B' },
      save_stretched_starless_channel_images: { val: false, def: false, name: "Save starless channel images", type: 'B' },
      stretched_channel_auto_contrast: { val: false, def: false, name : "Stretched channel auto contrast", type : 'B' },
      no_subdirs: { val: false, def: false, name : "No subdirectories", type : 'B' },
      create_process_icons: { val: true, def: true, name : "Create process icons", type : 'B' },
      use_drizzle: { val: false, def: false, name : "Drizzle", type : 'B' },
      drizzle_scale: { val: 2, def: 2, name : "Drizzle scale", type : 'I' },
      drizzle_drop_shrink: { val: 0.9, def: 0.9, name : "Drizzle drop shrink", type : 'R' },
      keep_integrated_images: { val: false, def: false, name : "Keep integrated images", type : 'B' },
      reset_on_setup_load: { val: true, def: true, name : "Reset on setup load", type : 'B' },
      keep_temporary_images: { val: false, def: false, name : "Keep temporary images", type : 'B' },
      keep_processed_images: { val: false, def: false, name : "Keep processed images", type : 'B' },
      debug: { val: false, def: false, name : "Debug", type : 'B' },
      flowchart_debug: { val: false, def: false, name : "Flowchart debug", type : 'B' },
      print_process_values: { val: false, def: false, name : "Print process values", type : 'B' },
      monochrome_image: { val: false, def: false, name : "Monochrome", type : 'B' },
      skip_imageintegration_clipping: { val: false, def: false, name : "No ImageIntegration clipping", type : 'B' },
      synthetic_l_image: { val: false, def: false, name : "Synthetic L", type : 'B' },
      synthetic_missing_images: { val: false, def: false, name : "Synthetic missing image", type : 'B' },
      force_file_name_filter: { val: false, def: false, name : "Use file name for filters", type : 'B' },
      unique_file_names: { val: false, def: false, name : "Unique file names", type : 'B' },
      use_starxterminator: { val: false, def: false, name : "Use StarXTerminator", type : 'B' },
      run_get_flowchart_data: { val: false, def: false, name : "Run get flowchart data", type : 'B', skip_reset: true },
      flowchart_background_image: { val: true, def: true, name : "Flowchart background image", type : 'B', skip_reset: true },
      flowchart_time: { val: true, def: true, name : "Flowchart time", type : 'B', skip_reset: true },
      flowchart_saveimage: { val: false, def: false, name : "Flowchart save image", type : 'B', skip_reset: true },

      use_blurxterminator: { val: false, def: false, name : "Use BlurXTerminator", type : 'B' },
      bxt_sharpen_stars: { val: 0.25, def: 0.25, name : "BlurXTerminator sharpen stars", type : 'R' },
      bxt_adjust_halo: { val: 0.00, def: 0.00, name : "BlurXTerminator adjust halos", type : 'R' },
      bxt_sharpen_nonstellar: { val: 0.90, def: 0.90, name : "BlurXTerminator sharpen nonstellar", type : 'R' },
      bxt_psf: { val: 0, def: 0, name : "BlurXTerminator PSF", type : 'R' },
      bxt_image_psf: { val: false, def: false, name : "BlurXTerminator image PSF", type : 'B' },
      bxt_median_psf: { val: false, def: false, name : "BlurXTerminator median PSF", type : 'B' },
      bxt_correct_only_before_cc: { val: false, def: false, name : "BlurXTerminator correct only before CC", type : 'B' },
      bxt_correct_channels: { val: false, def: false, name : "BlurXTerminator correct only channels", type : 'B' },
      nxt_denoise: { val: 0.9, def: 0.9, name : "NoiseXTerminator denoise", type : 'R' },
      nxt_iterations: { val: 2, def: 2, name : "NoiseXTerminator iterations", type : 'I' },
      nxt_enable_color_separation: { val: false, def: false, name : "NoiseXTerminator enable color separation", type : 'B' },
      nxt_denoise_color: { val: 0.9, def: 0.9, name : "NoiseXTerminator denoise color", type : 'R' },
      nxt_enable_frequency_separation: { val: false, def: false, name : "NoiseXTerminator enable frequency separation", type : 'B' },
      nxt_denoise_lf: { val: 0.9, def: 0.9, name : "NoiseXTerminator denoise LF", type : 'R' },
      nxt_frequency_scale: { val: 5, def: 5, name : "NoiseXTerminator frequency scale", type : 'R' },
      nxt_denoise_lf_color: { val: 0.9, def: 0.9, name : "NoiseXTerminator denoise LF color", type : 'R' },
      nxt_detail: { val: 0.15, def: 0.15, name : "NoiseXTerminator detail", type : 'R' },   // Old

      deepsnr_amount: { val: 0.8, def: 0.8, name : "DeepSNR amount", type : 'R' },
      
      use_noisexterminator: { val: false, def: false, name : "Use NoiseXTerminator", type : 'B' },
      use_starnet2: { val: false, def: false, name : "Use StarNet2", type : 'B' },
      use_deepsnr: { val: false, def: false, name : "Use DeepSNR", type : 'B' },
      win_prefix_to_log_files: { val: false, def: false, name : "Add window prefix to log files", type : 'B' },
      start_from_imageintegration: { val: false, def: false, name : "Start from ImageIntegration", type : 'B' },
      generate_xdrz: { val: false, def: false, name : "Generate .xdrz files", type : 'B' },
      autosave_setup: { val: true, def: true, name: "Autosave setup", type: 'B' },
      use_processed_files: { val: false, def: false, name: "Use processed files", type: 'B' },
      save_cropped_images: { val: false, def: false, name: "Save cropped images", type: 'B' },

      open_directory: { val: false, def: false, name: "Open directory", type: 'B' },
      directory_files: { val: "*.fits *.fit", def: "*.fits *.fit", name : "Directory files", type : 'S' },

      // astrobin variables
      astrobin_L: { val: "", def: "", name : "AstroBin L", type : 'S', skip_reset: true },
      astrobin_R: { val: "", def: "", name : "AstroBin R", type : 'S', skip_reset: true },
      astrobin_G: { val: "", def: "", name : "AstroBin G", type : 'S', skip_reset: true },
      astrobin_B: { val: "", def: "", name : "AstroBin B", type : 'S', skip_reset: true },
      astrobin_H: { val: "", def: "", name : "AstroBin H", type : 'S', skip_reset: true },
      astrobin_S: { val: "", def: "", name : "AstroBin S", type : 'S', skip_reset: true },
      astrobin_O: { val: "", def: "", name : "AstroBin O", type : 'S', skip_reset: true },
      astrobin_C: { val: "", def: "", name : "AstroBin C", type : 'S', skip_reset: true },

      // Narrowband processing
      narrowband_mapping: { val: 'Auto', def: 'Auto', name : "Narrowband mapping", type : 'S' },
      custom_R_mapping: { val: 'Auto', def: 'Auto', name : "Narrowband R mapping", type : 'S' },
      custom_G_mapping: { val: 'Auto', def: 'Auto', name : "Narrowband G mapping", type : 'S' },
      custom_B_mapping: { val: 'Auto', def: 'Auto', name : "Narrowband B mapping", type : 'S' },
      custom_L_mapping: { val: 'Auto', def: 'Auto', name : "Narrowband L mapping", type : 'S' },
      narrowband_linear_fit: { val: 'Auto', def: 'Auto', name : "Narrowband linear fit", type : 'S' },
      mapping_on_nonlinear_data: { val: false, def: false, name : "Narrowband mapping on non-linear data", type : 'B' },
      force_narrowband_mapping: { val: false, def: false, name : "Force narrowband mapping", type : 'B' },
      remove_stars_before_stretch: { val: false, def: false, name : "Remove stars early", type : 'B' },
      remove_stars_light: { val: false, def: false, name : "Remove stars light", type : 'B' },
      remove_stars_channel: { val: false, def: false, name : "Remove stars channel", type : 'B' },
      remove_stars_stretched: { val: false, def: false, name : "Remove stars stretched", type : 'B' },
      create_RGB_stars: { val: false, def: false, name : "RGB stars", type : 'B' },
      use_narrowband_multiple_mappings: { val: false, def: false, name : "Use narrowband multiple mappings", type : 'B' },
      narrowband_multiple_mappings_list: { val: "", def: "", name : "Narrowband multiple mappings list", type : 'S' },

      // Ha to RGB mapping
      use_RGBHa_Mapping: { val: false, def: false, name : "Ha RGB mapping", type : 'B' },
      RGBHa_preset: { val: 'Combine Continuum Subtract', def: 'Combine Continuum Subtract', name : "Ha RGB mapping preset", type : 'S' },
      RGBHa_prepare_method: { val: 'Continuum Subtract', def: 'Continuum Subtract', name : "Ha RGB mapping prepare method", type : 'S' },
      RGBHa_combine_time: { val: 'Stretched', def: 'Stretched', name : "Ha RGB mapping combine time", type : 'S' },
      RGBHa_combine_method: { val: 'Bright structure add', def: 'Bright structure add', name : "Ha RGB mapping combine method", type : 'S' },
      RGBHa_noise_reduction: { val: true, def: true, name : "Ha RGB mapping noise reduction", type : 'B' },
      RGBHa_boost: { val: 1.0, def: 1.0, name : "Ha RGB boost", type : 'R' },
      RGBHa_gradient_correction: { val: false, def: false, name : "Ha RGB mapping gradient correction", type : 'B' },
      RGBHa_smoothen_background: { val: false, def: false, name : "Ha RGB mapping smoothen background", type : 'B' },
      RGBHa_smoothen_background_value: { val: 25, def: 25, name : "Ha RGB mapping smoothen background value", type : 'R' },
      RGBHa_remove_stars: { val: false, def: false, name : "Ha RGB mapping remove stars", type : 'B' },
      RGBHa_Combine_BoostFactor: { val: 1.0, def: 1.0, name : "Ha RGB mapping combine boost factor", type : 'R' },
      RGBHa_Add_BoostFactor: { val: 0.5, def: 0.5, name : "Ha RGB mapping SPCC boost factor", type : 'R' },
      RGBHa_test_value: { val: 'Mapping', def: 'Mapping', name : "Narrowband RGB mapping O bandwidth", type : 'R' },
      
      // Narrowband to RGB mapping
      use_RGBNB_Mapping: { val: false, def: false, name : "Narrowband RGB mapping", type : 'B' },
      RGBNB_use_RGB_image: { val: false, def: false, name : "Narrowband RGB mapping use RGB", type : 'B' },
      RGBNB_gradient_correction: { val: false, def: false, name : "Narrowband RGB mapping gradient correction", type : 'B' },
      RGBNB_linear_fit: { val: false, def: false, name : "Narrowband RGB mapping linear fit", type : 'B' },
      RGBNB_L_mapping: { val: '',  def: '',  name : "Narrowband RGB mapping for L", type : 'S' },
      RGBNB_R_mapping: { val: 'H', def: 'H', name : "Narrowband RGB mapping for R", type : 'S' },
      RGBNB_G_mapping: { val: '', def: '', name : "Narrowband RGB mapping for G", type : 'S' },
      RGBNB_B_mapping: { val: '', def: '', name : "Narrowband RGB mapping for B", type : 'S' },
      RGBNB_L_BoostFactor: { val: 1.2, def: 1.2, name : "Narrowband RGB mapping L boost factor", type : 'R' },
      RGBNB_R_BoostFactor: { val: 1.2, def: 1.2, name : "Narrowband RGB mapping R boost factor", type : 'R' },
      RGBNB_G_BoostFactor: { val: 1.2, def: 1.2, name : "Narrowband RGB mapping G boost factor", type : 'R' },
      RGBNB_B_BoostFactor: { val: 1.2, def: 1.2, name : "Narrowband RGB mapping B boost factor", type : 'R' },
      RGBNB_L_bandwidth: { val: 300, def: 300, name : "Narrowband RGB mapping L bandwidth", type : 'R' },
      RGBNB_R_bandwidth: { val: 100, def: 100, name : "Narrowband RGB mapping R bandwidth", type : 'R' },
      RGBNB_G_bandwidth: { val: 100, def: 100, name : "Narrowband RGB mapping G bandwidth", type : 'R' },
      RGBNB_B_bandwidth: { val: 100, def: 100, name : "Narrowband RGB mapping B bandwidth", type : 'R' },
      RGBNB_H_bandwidth: { val: 3, def: 3, name : "Narrowband RGB mapping H bandwidth", type : 'R' },
      RGBNB_S_bandwidth: { val: 3, def: 3, name : "Narrowband RGB mapping S bandwidth", type : 'R' },
      RGBNB_O_bandwidth: { val: 3, def: 3, name : "Narrowband RGB mapping O bandwidth", type : 'R' },

      // Processing settings
      auto_noise_reduction: { val: true, def: true, name : "Auto noise reduction", type : 'B' },
      channel_noise_reduction: { val: false, def: false, name : "Channel noise reduction", type : 'B' },
      non_linear_noise_reduction: { val: false, def: false, name : "Non-linear noise reduction", type : 'B' },
      noise_reduction_strength: { val: 3, def: 3, name : "Noise reduction strength", type : 'I' },
      luminance_noise_reduction_strength: { val: 3, def: 3, name : "Noise reduction strength on luminance image", type : 'I' },
      combined_image_noise_reduction: { val: false, def: false, name : "Do noise reduction on integrated image", type : 'B' },
      processed_image_noise_reduction: { val: false, def: false, name : "Do noise reduction on processed image", type : 'B', oldname : "Do noise reduction on combined image" },
      use_color_noise_reduction: { val: false, def: false, name : "Color noise reduction", type : 'B' },
      use_ACDNR_noise_reduction: { val: true, def: true, name : "Use ACDNR noise reduction", type : 'B' },
      ACDNR_noise_reduction: { val: 1.0, def: 1.0, name : "ACDNR noise reduction", type : 'R' },
      use_weight: { val: 'PSF Signal', def: 'PSF Signal', name : "Weight calculation", type : 'S' },
      ssweight_limit: { val: 0.0000000001, def: 0.0000000001, name : "SSWEIGHT limit", type : 'R' },
      sort_order_type: { val: 'SSWEIGHT', def: 'SSWEIGHT', name : "Filtering sort order", type : 'S' },
      filter_limit1_type: { val: 'PSFSignal', def: 'PSFSignal', name : "Filter limit 1 type", type : 'S' },
      filter_limit1_val: { val: 0, def: 0, name : "Filter limit 1 value", type : 'R' },
      filter_limit2_type: { val: 'FWHM', def: 'FWHM', name : "Filter limit 2 type", type : 'S' },
      filter_limit2_val: { val: 0, def: 0, name : "Filter limit 2 value", type : 'R' },
      filter_limit3_type: { val: 'Eccentricity', def: 'Eccentricity', name : "Filter limit 3 type", type : 'S' },
      filter_limit3_val: { val: 0, def: 0, name : "Filter limit 3 value", type : 'R' },
      filter_limit4_type: { val: 'Stars', def: 'Stars', name : "Filter limit 4 type", type : 'S' },
      filter_limit4_val: { val: 0, def: 0, name : "Filter limit 4 value", type : 'R' },
      outliers_ssweight: { val: false, def: false, name : "Outliers SSWEIGHT", type : 'B' },
      outliers_fwhm: { val: false, def: false, name : "Outliers FWHM", type : 'B' },
      outliers_ecc: { val: false, def: false, name : "Outliers eccentricity", type : 'B' },
      outliers_snr: { val: false, def: false, name : "Outliers SNR", type : 'B' },
      outliers_psfsignal: { val: false, def: false, name : "Outliers PSF Signal", type : 'B' },
      outliers_psfpower: { val: false, def: false, name : "Outliers PSF Power", type : 'B' },
      outliers_stars: { val: false, def: false, name : "Outliers Stars", type : 'B' },
      outliers_method: { val: 'Two sigma', def: 'Two sigma', name : "Outlier method", type : 'S' },
      outliers_minmax: { val: false, def: false, name : "Outlier min max", type : 'B' },
      use_linear_fit: { val: 'Auto', def: 'Auto', name : "Linear fit", type : 'S' },

      gc_scale: { val: 5, def: 5, name : "GC scale", type : 'R' },
      gc_smoothness: { val: 0.4, def: 0.4, name : "GC smoothness", type : 'R' },
      gc_automatic_convergence: { val: false, def: false, name : "GC automatic convergence", type : 'B' },
      gc_structure_protection: { val: true, def: true, name : "GC structure protection", type : 'B' },
      gc_protection_threshold: { val: 0.10, def: 0.10, name : "GC protection threshold", type : 'R' },
      gc_protection_amount: { val: 0.50, def: 0.50, name : "GC protection amount", type : 'R' },
      gc_output_background_model: { val: false, def: false, name : "GC output background model", type : 'B' },
      gc_simplified_model: { val: false, def: false, name : "GC simplified model", type : 'B' },
      gc_simplified_model_degree: { val: 1, def: 1, name : "GC simplified model degree", type : 'I' },
      mgc_scale: { val: '1024', def: '1024', name : "MGC scale", type : 'S' },
      mgc_output_background_model: { val: false, def: false, name : "MGC output background model", type : 'B' },
      mgc_scale_factor: { val: 1.0, def: 1.0, name : "MGC scale factor", type : 'R' },
      mgc_structure_separation: { val: 3, def: 3, name : "MGC structure separation", type : 'I' },
      
      ABE_degree: { val: 4, def: 4, name : "ABE function degree", type : 'I' },
      ABE_correction: { val: 'Subtraction', def: 'Subtraction', name : "ABE correction", type : 'S' },
      ABE_normalize: { val: false, def: false, name : "ABE normalize", type : 'B' },

      dbe_use_background_neutralization: { val: false, def: false, name : "DBE use background neutralization", type : 'B' },
      dbe_use_abe: { val: false, def: false, name : "DBE use ABE", type : 'B' },
      dbe_samples_per_row: { val: 10, def: 10, name : "DBE samples per row", type : 'I' },
      dbe_normalize : { val: false, def: false, name : "DBE normalize", type : 'B' },
      dbe_min_weight : { val: 0.75, def: 0.75, name : "DBE min weight", type : 'I' },

      graxpert_path: { val: "", def: "", name : "GraXpert path", type : 'S', skip_reset: true },
      graxpert_correction: { val: "Subtraction", def: "Subtraction", name : "GraXpert correction", type : 'S' },
      graxpert_smoothing: { val: 0.5, def: 0.5, name : "GraXpert smoothing", type : 'R' },
      graxpert_denoise_strength: { val: 0.5, def: 0.5, name : "GraXpert denoise strength", type : 'R' },
      graxpert_denoise_batch_size: { val: '4', def: '4', name : "GraXpert denoise batch size", type : 'S' },
      graxpert_deconvolution_stellar_strength: { val: 0.5, def: 0.5, name : "GraXpert deconvolution stellar strength", type : 'R' },
      graxpert_deconvolution_stellar_psf: { val: 2.0, def: 2.0, name : "GraXpert deconvolution stellar PSF", type : 'R' },
      graxpert_deconvolution_nonstellar_strength: { val: 0.5, def: 0.5, name : "GraXpert deconvolution nonstellar strength", type : 'R' },
      graxpert_deconvolution_nonstellar_psf: { val: 2.0, def: 2.0, name : "GraXpert deconvolution nonstellar PSF", type : 'R' },
      graxpert_median_psf: { val: true, def: true, name : "GraXpert median PSF", type : 'B' },

      starxterminator_ai_model: { val: "", def: "", name : "StarXTerminator AI model", type : 'S', skip_reset: true },
      starxterminator_large_overlap: { val: false, def: false, name : "StarXTerminator large overlap", type : 'B' },
      crop_tolerance: { val: 2, def: 2, name : "Crop tolerance", type : 'I' },
      crop_use_rejection_low: { val: true, def: true, name : "Crop use rejection low", type : 'B' },
      crop_rejection_low_limit: { val: 0.2, def: 0.2, name : "Crop rejection low limit", type : 'R' },
      crop_check_limit: { val: 5, def: 5, name : "Crop check limit", type : 'R' },
      image_stretching: { val: 'Auto STF', def: 'Auto STF', name : "Image stretching", type : 'S' },
      stars_stretching: { val: 'Arcsinh Stretch', def: 'Arcsinh Stretch', name : "Stars stretching", type : 'S' },
      stars_combine: { val: 'Screen', def: 'Screen', name : "Stars combine", type : 'S' },
      STF_linking: { val: 'Auto', def: 'Auto', name : "RGB channel linking", type : 'S' },
      imageintegration_normalization: { val: 'Additive', def: 'Additive', name : "ImageIntegration Normalization", type : 'S' },
      integration_combination: { val: 'Average', def: 'Average', name : "ImageIntegration Combination", type : 'S' },
      use_clipping: { val: 'Auto2', def: 'Auto2', name : "ImageIntegration rejection", type : 'S' },

      target_type: { val: 'Default', def: 'Default', name : "Target type", type : 'S' },

      percentile_low: { val: 0.2, def: 0.2, name : "Percentile low", type : 'R' },
      percentile_high: { val: 0.1, def: 0.1, name : "Percentile high", type : 'R' },
      sigma_low: { val: 4.0, def: 4.0, name : "Sigma low", type : 'R' },
      sigma_high: { val: 3.0, def: 3.0, name : "Sigma high", type : 'R' },
      winsorised_cutoff: { val: 5.0, def: 5.0, name : "Winsorised cutoff", type : 'R' },
      linearfit_low: { val: 5.0, def: 5.0, name : "Linear fit low", type : 'R' },
      linearfit_high: { val: 4.0, def: 4.0, name : "Linear fit high", type : 'R' },
      ESD_outliers: { val: 0.3, def: 0.3, name : "ESD outliers", type : 'R' },
      ESD_significance: { val: 0.05, def: 0.05, name : "ESD significance", type : 'R' },
      large_scale_pixel_rejection_high: { val: false, def: false, name : "Large scale pixel rejection high", type : 'B' },
      large_scale_pixel_rejection_low: { val: false, def: false, name : "Large scale pixel rejection low", type : 'B' },
      // ESD_lowrelaxation: { val: 1.50, def: 1.50, name : "ESD low relaxation", type : 'R' }, deprecated, use default for old version
      use_localnormalization_multiscale: { val: false, def: false, name : "Use LocalNormalization Multiscale", type : 'B' },
      fastintegration_iterations: { val: 2, def: 2, name : "FastIntegration iterations", type : 'I' },
      fastintegration_max_flux: { val: 0.5, def: 0.5, name : "FastIntegration max flux", type : 'R' },
      fastintegration_errortolerance: { val: 1.5, def: 1.5, name : "FastIntegration error tolerance", type : 'R' },
      fastintegration_fast_subframeselector: { val: true, def: true, name : "FastIntegration fast SubframeSelector", type : 'B' },
      fastintegration_skip_cosmeticcorrection: { val: true, def: true, name : "FastIntegration skip CosmeticCorrection", type : 'B' },
      drizzle_function: { val: 'Square', def: 'Square', name : "Drizzle function", type : 'S' },
      drizzle_fast_mode: { val: true, def: true, name : "Drizzle fast mode", type : 'B' },

      cosmetic_correction_hot_sigma: { val: 3, def: 3, name : "CosmeticCorrection hot sigma", type : 'I' },
      cosmetic_correction_cold_sigma: { val: 3, def: 3, name : "CosmeticCorrection cold sigma", type : 'I' },
      STF_targetBackground: { val: 0.25, def: 0.25, name : "STF targetBackground", type : 'R' },    
      MaskedStretch_targetBackground: { val: 0.125, def: 0.125, name : "Masked Stretch targetBackground", type : 'R' },    
      MaskedStretch_prestretch_target: { val: 0.1, def: 0.1, name : "Masked Stretch prestretch target", type : 'R' },    
      Arcsinh_stretch_factor: { val: 50, def: 50, name : "Arcsinh Stretch Factor", type : 'R' },    
      Arcsinh_black_point: { val: 0.01, def: 0.01, name : "Arcsinh Stretch black point", type : 'R' }, 
      Arcsinh_iterations: { val: 3, def: 3, name : "Arcsinh Stretch iterations", type : 'I' }, 

      veralux_processing_mode: { val: 'Ready-to-Use', def: 'Ready-to-Use', name : "VeraLux processing mode", type : 'S' },
      veralux_sensor_profile: { val: 'Default', def: 'Default', name : "VeraLux sensor profile", type : 'S' },
      veralux_target_bg: { val: 0.20, def: 0.20, name : "VeraLux target background", type : 'R' },
      veralux_adaptive_anchor: { val: true, def: true, name : "VeraLux adaptive anchors", type : 'B' },
      veralux_auto_calc_D: { val: false, def: false, name : "VeraLux auto calculate D", type : 'B' },
      veralux_D_value: { val: 2.0, def: 2.0, name : "VeraLux D value", type : 'R' },
      veralux_b_value: { val: 6.0, def: 6.0, name : "VeraLux b value", type : 'R' },
      veralux_convergence_power: { val: 3.5, def: 3.5, name : "VeraLux convergence power", type : 'R' },
      veralux_color_strategy: { val: 0, def: 0, name : "VeraLux color strategy", type : 'I' },
      veralux_color_grip: { val: 1.0, def: 1.0, name : "VeraLux color grip", type : 'R' },
      veralux_shadow_convergence: { val: 1.0, def: 1.0, name : "VeraLux shadow convergence", type : 'R' },

      LRGBCombination_lightness: { val: 0.5, def: 0.5, name : "LRGBCombination lightness", type : 'R' },    
      LRGBCombination_saturation: { val: 0.5, def: 0.5, name : "LRGBCombination saturation", type : 'R' },    
      LRGBCombination_linearfit: { val: false, def: false, name : "LRGBCombination linear fit", type : 'B' },
      linear_increase_saturation: { val: 1, def: 1, name : "Linear saturation increase", type : 'I' },    
      non_linear_increase_saturation: { val: 1, def: 1, name : "Non-linear saturation increase", type : 'I' },    
      use_chrominance: { val: false, def: false, name : "Use chrominance", type : 'B' },
      stretch_adjust_shadows: { val: "none", def: "none", name : "Stretch adjust shadows", type : 'S' }, 
      stretch_adjust_shadows_perc: { val: 0.00, def: 0.00, name : "Stretch adjust shadows perc", type : 'R' }, 
      histogram_stretch_type: { val: 'Median', def: 'Median', name : "Histogram stretch type", type : 'S' }, 
      histogram_stretch_target: { val: 0.25, def: 0.25, name : "Histogram stretch target", type : 'I' }, 
      other_stretch_target: { val: 0.25, def: 0.25, name : "Logarithmic stretch target", type : 'I' }, 
      smoothbackground: { val: 0, def: 0, name : "Smooth background", type : 'R' },
      target_name: { val: '', def: '', name : "Target name", type : 'S' }, 
      target_radec: { val: '', def: '', name : "Target RA/DEC", type : 'S' }, 
      target_focal: { val: '', def: '', name : "Target focal length", type : 'S' }, 
      target_pixel_size: { val: '', def: '', name : "Target pixel size", type : 'S' }, 
      target_binning: { val: 'Auto', def: 'Auto', name : "Target binning", type : 'S' }, 
      target_drizzle: { val: 'Auto', def: 'Auto', name : "Target drizzle", type : 'S' }, 
      target_forcesolve: { val: false, def: false, name : "Target force solve", type : 'B' }, 
      target_interactivesolve: { val: false, def: false, name : "Target interactive solve", type : 'B' }, 
      spcc_detection_scales: { val: 5, def: 5, name : "SPCC detection scales", type : 'I' }, 
      spcc_noise_scales: { val: 1, def: 1, name : "SPCC noise scales", type : 'I' }, 
      spcc_min_struct_size: { val: 0, def: 0, name : "SPCC min struct size", type : 'I' }, 
      spcc_red_wavelength: { val: 671.60, def: 671.60, name : "SPCC red wavelength", type : 'R' },
      spcc_red_bandwidth: { val: 3, def: 3, name : "SPCC red bandwidth", type : 'R' },
      spcc_green_wavelength: { val: 656.30, def: 656.30, name : "SPCC green wavelength", type : 'R' },
      spcc_green_bandwidth: { val: 3, def: 3, name : "SPCC green bandwidth", type : 'R' },
      spcc_blue_wavelength: { val: 500.70, def: 500.70, name : "SPCC blue wavelength", type : 'R' },
      spcc_blue_bandwidth: { val: 3, def: 3, name : "SSPCC blue bandwidth", type : 'R' },
      spcc_narrowband_mode: { val: false, def: false, name : "SPCC narrowband mode", type : 'B' },
      spcc_background_neutralization: { val: true, def: true, name : "SPCC background neutralization", type : 'B' },
      spcc_auto_narrowband: { val: true, def: true, name : "SPCC narrowband auto mode", type : 'B' },
      spcc_white_reference: { val: 'Average Spiral Galaxy', def: 'Average Spiral Galaxy', name : "SPCC white reference", type : 'S' },
      spcc_limit_magnitude: { val: 'Auto', def: 'Auto', name : "SPCC limit magnitude", type : 'S' },
      spcc_saturation_threshold: { val: 0.75, def: 0.75, name : "SPCC saturation threshold", type : 'R' },
      spcc_min_SNR: { val: 40, def: 40, name : "SPCC min SNR", type : 'R' },
      color_calibration_narrowband: { val: false, def: false, name : "ColorCalibration narrowband", type : 'B' },
      color_calibration_time: { val: 'auto', def: 'auto', name : "ColorCalibration time", type : 'S' },

      // Extra processing for narrowband
      run_foraxx_mapping: { val: false, def: false, name : "Extra Foraxx mapping", type : 'B' },
      foraxx_palette: { val: "SHO", def: "SHO", name : "Extra Foraxx palette", type : 'S' },
      run_extra_narrowband_mapping: { val: false, def: false, name : "Extra narrowband mapping", type : 'B' },
      extra_narrowband_mapping_source_palette: { val: "SHO", def: "SHO", name : "Extra narrowband mapping source palette", type : 'S' },
      extra_narrowband_mapping_target_palette: { val: "HOS", def: "HOS", name : "Extra narrowband mapping target palette", type : 'S' },
      run_orangeblue_colors: { val: false, def: false, name : "Extra orangeblue colors", type : 'B' },
      run_less_green_hue_shift: { val: false, def: false, name : "Extra narrowband green hue shift", type : 'B' },
      run_orange_hue_shift: { val: false, def: false, name : "Extra narrowband more orange", type : 'B' },
      run_hue_shift: { val: false, def: false, name : "Extra narrowband hue shift", type : 'B' },

      run_colorized_narrowband: { val: false, def: false, name : "Extra colorized narrowband", type : 'B' },
      colorized_integrated_images: { val: false, def: false, name : "Extra colorized narrowband integrated images", type : 'B' },
      colorized_narrowband_preset: { val: "Default", def: "Default", name : "Extra colorized narrowband preset", type : 'S' },
      narrowband_colorized_R_hue: { val: 0.0, def: 0.0, name : "Extra colorized narrowband R hue", type : 'R' },
      narrowband_colorized_R_sat: { val: 0.5, def: 0.5, name : "Extra colorized narrowband R sat", type : 'R' },
      narrowband_colorized_R_weight: { val: 1.0, def: 1.0, name : "Extra colorized narrowband R weight", type : 'R' },
      narrowband_colorized_G_hue: { val: 0.33, def: 0.33, name : "Extra colorized narrowband G hue", type : 'R' },
      narrowband_colorized_G_sat: { val: 0.5, def: 0.5, name : "Extra colorized narrowband G sat", type : 'R' },
      narrowband_colorized_G_weight: { val: 1.0, def: 1.0, name : "Extra colorized narrowband G weight", type : 'R' },
      narrowband_colorized_B_hue: { val: 0.67, def: 0.67, name : "Extra colorized narrowband B hue", type : 'R' },
      narrowband_colorized_B_sat: { val: 0.5, def: 0.5, name : "Extra colorized narrowband B sat", type : 'R' },
      narrowband_colorized_B_weight: { val: 1.0, def: 1.0, name : "Extra colorized narrowband B weight", type : 'R' },
      narrowband_colorized_mapping: { val: 'RGB', def: 'RGB', name : "Extra colorized narrowband mapping", type : 'S' },
      narrowband_colorized_combine: { val: 'Channels', def: 'Channels', name : "Extra colorized narrowband combine", type : 'S' },
      narrowband_colorized_method: { val: 'PixelMath', def: 'PixelMath', name : "Extra colorized narrowband method", type : 'S' },
      narrowband_colorized_linear_fit: { val: false, def: false, name : "Extra colorized narrowband linear fit", type : 'B' },
      
      leave_some_green: { val: false, def: false, name : "Extra narrowband leave some green", type : 'B' },
      leave_some_green_amount: { val: 0.50, def: 0.50, name : "Extra narrowband leave some green amount", type : 'R' },
      run_narrowband_SCNR: { val: false, def: false, name : "Extra narrowband remove green", type : 'B' },
      remove_magenta_color: { val: false, def: false, name : "Extra remove magenta color", type : 'B' },
      fix_narrowband_star_color: { val: false, def: false, name : "Extra narrowband fix star colors", type : 'B' },
      skip_star_fix_mask: { val: false, def: false, name : "Extra narrowband no star mask", type : 'B' },

      // Generic Extra processing
      extra_remove_stars: { val: false, def: false, name : "Extra remove stars", type : 'B' },
      extra_unscreen_stars: { val: false, def: false, name : "Extra unscreen stars", type : 'B' },
      extra_fix_star_cores: { val: false, def: false, name : "Extra fix star cores", type : 'B' },
      extra_combine_stars: { val: false, def: false, name : "Extra combine starless and stars", type : 'B' },
      extra_combine_stars_mode: { val: 'Screen', def: 'Screen', name : "Extra remove stars combine", type : 'S' },
      extra_combine_stars_image: { val: 'Auto', def: 'Auto', name : "Extra stars image", type : 'S' },
      extra_combine_stars_reduce: { val: 'None', def: 'None', name : "Extra combine stars reduce", type : 'S' },
      extra_combine_stars_reduce_S: { val: 0.15, def: 0.15, name : "Extra combine stars reduce S", type : 'R' },
      extra_combine_stars_reduce_M: { val: 1, def: 1, name : "Extra combine stars reduce M", type : 'R' },
      extra_backgroundneutralization: { val: false, def: false, name : "Extra background neutralization", type : 'B' },
      extra_GC: { val: false, def: false, name : "Extra GC", type : 'B', oldname: 'Extra ABE' },
      extra_GC_method: { val: 'Auto', def: 'Auto', name : "Extra GC method", type : 'S' },
      extra_banding_reduction: { val: false, def: false, name : "Extra banding reduction", type : 'B' },
      extra_darker_background: { val: false, def: false, name : "Extra Darker background", type : 'B' },
      extra_darker_highlights: { val: false, def: false, name : "Extra Darker highlights", type : 'B' },
      extra_ET: { val: false, def: false, name : "Extra ExponentialTransformation", type : 'B' },
      extra_ET_order: { val: 1.0, def: 1.0, name : "Extra ExponentialTransformation Order", type : 'I' },
      extra_ET_adjusttype: { val: 'Lights', def: 'Lights', name : "Extra ExponentialTransformation adjust type", type : 'S' },
      extra_HDRMLT: { val: false, def: false, name : "Extra HDRMLT", type : 'B' },
      extra_HDRMLT_layers: { val: 6, def: 6, name : "Extra HDRMLT layers", type : 'I' },
      extra_HDRMLT_overdrive: { val: 0, def: 0, name : "Extra HDRMLT overdrive", type : 'R' },
      extra_HDRMLT_iterations: { val: 1, def: 1, name : "Extra HDRMLT iterations", type : 'I' },
      extra_HDRMLT_color: { val: 'None', def: 'None', name : "Extra HDRMLT hue", type : 'S' },
      extra_LHE: { val: false, def: false, name : "Extra LHE", type : 'B' },
      extra_LHE_kernelradius: { val: 110, def: 110, name : "Extra LHE kernel radius", type : 'I' },
      extra_LHE_contrastlimit: { val: 1.3, def: 1.3, name : "Extra LHE contrast limit", type : 'R' },
      extra_LHE_adjusttype: { val: 'Lights', def: 'Lights', name : "Extra LHE adjust type", type : 'S' },
      extra_contrast: { val: false, def: false, name : "Extra contrast", type : 'B' },
      extra_contrast_iterations: { val: 1, def: 1, name : "Extra contrast iterations", type : 'I' },
      extra_auto_contrast: { val: false, def: false, name : "Extra auto contrast", type : 'B' },
      extra_auto_contrast_limit_low: { val: 0.0000, def: 0.0000, name : "Extra auto contrast limit", type : 'R' },
      extra_auto_contrast_limit_high: { val: 100, def: 100, name : "Extra auto contrast limit high", type : 'R' },
      extra_auto_contrast_channels: { val: false, def: false, name : "Extra auto contrast channels", type : 'B' },
      extra_stretch: { val: false, def: false, name : "Extra stretch", type : 'B' },
      extra_autostf: { val: false, def: false, name : "Extra AutoSTF", type : 'B' },
      extra_signature: { val: false, def: false, name : "Extra signature", type : 'B' },
      extra_signature_path: { val: "", def: "", name : "Extra signature path", type : 'S' },
      extra_signature_scale: { val: 0, def: 0, name : "Extra signature scale", type : 'I' },
      extra_signature_position: { val: 'Bottom left', def: 'Bottom left', name : "Extra signature position", type : 'S' },
      extra_shadowclipping: { val: false, def: false, name : "Extra shadow clipping", type : 'B' },
      extra_shadowclippingperc: { val: 0.0001, def: 0.0001, name : "Extra shadow clipping percentage", type : 'R' },
      extra_smoothbackground: { val: false, def: false, name : "Extra smooth background", type : 'B' },
      extra_smoothbackgroundval: { val: 0.01, def: 0.01, name : "Extra smooth background value", type : 'R' },
      extra_smoothbackgroundfactor: { val: 0.5, def: 0.5, name : "Extra smooth background factor", type : 'R' },
      extra_normalize_channels: { val: false, def: false, name : "Extra normalize channels", type : 'B' },
      extra_normalize_channels_reference: { val: 'G', def: 'G', name : "Extra normalize channels reference", type : 'S' },
      extra_normalize_channels_mask: { val: false, def: false, name : "Extra normalize channels mask", type : 'B' },
      extra_normalize_channels_rescale: { val: false, def: false, name : "Extra normalize channels rescale", type : 'B' },
      extra_adjust_channels: { val: false, def: false, name : "Extra adjust channels", type : 'B' },
      extra_adjust_channels_only_k: { val: false, def: false, name : "Extra adjust channels K", type : 'B' },
      extra_adjust_R: { val: 1, def: 1, name : "Extra adjust R", type : 'R' },
      extra_adjust_G: { val: 1, def: 1, name : "Extra adjust G", type : 'R' },
      extra_adjust_B: { val: 1, def: 1, name : "Extra adjust B", type : 'R' },
      extra_force_new_mask: { val: true, def: true, name : "Extra force new mask", type : 'B' },
      extra_range_mask: { val: false, def: false, name : "Extra range_mask", type : 'B' },
      extra_auto_reset: { val: true, def: true, name : "Extra auto reset", type : 'B' },
      extra_shadow_enhance: { val: false, def: false, name : "Extra shadow enhance", type : 'B' },
      extra_highlight_enhance: { val: false, def: false, name : "Extra highlight enhance", type : 'B' },
      extra_gamma: { val: false, def: false, name : "Extra gamma", type : 'B' },
      extra_gamma_value: { val: 1, def: 1, name : "Extra gamma value", type : 'R' },
            
      extra_noise_reduction: { val: false, def: false, name : "Extra noise reduction", type : 'B' },
      extra_ACDNR: { val: false, def: false, name : "Extra ACDNR noise reduction", type : 'B' },
      extra_color_noise: { val: false, def: false, name : "Extra color noise reduction", type : 'B' },
      extra_star_noise_reduction: { val: false, def: false, name : "Extra star noise reduction", type : 'B' },
      extra_sharpen: { val: false, def: false, name : "Extra sharpen", type : 'B' },
      extra_sharpen_iterations: { val: 1, def: 1, name : "Extra sharpen iterations", type : 'I' },
      extra_unsharpmask: { val: false, def: false, name : "Extra unsharpmask", type : 'B' },
      extra_unsharpmask_stddev: { val: 2, def: 2, name : "Extra unsharpmask stddev", type : 'I' },
      extra_unsharpmask_amount: { val: 0.8, def: 0.8, name : "Extra unsharpmask amount", type : 'I' },
      extra_highpass_sharpen: { val: false, def: false, name : "Extra highpass sharpen", type : 'B' },
      extra_highpass_sharpen_method: { val: 'Default', def: 'Default', name : "Extra highpass sharpen method", type : 'S' },
      extra_highpass_sharpen_layers: { val: 5, def: 5, name : "Extra highpass sharpen layers", type : 'I' },
      extra_highpass_sharpen_keep_images: { val: false, def: false, name : "Extra highpass sharpen keep images", type : 'B' },
      extra_highpass_sharpen_combine_only: { val: false, def: false, name : "Extra highpass sharpen combine only", type : 'B' },
      extra_highpass_sharpen_noise_reduction: { val: false, def: false, name : "Extra highpass sharpen noise reduction", type : 'B' },
      extra_clarity: { val: false, def: false, name : "Extra clarity", type : 'B' },
      extra_clarity_stddev: { val: 100, def: 100, name : "Extra clarity stddev", type : 'I' },
      extra_clarity_amount: { val: 0.3, def: 0.3, name : "Extra clarity amount", type : 'I' },
      extra_clarity_mask: { val: false, def: false, name : "Extra clarity mask", type : 'B' },
      extra_saturation: { val: false, def: false, name : "Extra saturation", type : 'B' },
      extra_saturation_iterations: { val: 1, def: 1, name : "Extra saturation iterations", type : 'I' },
      extra_smaller_stars: { val: false, def: false, name : "Extra smaller stars", type : 'B' },
      extra_smaller_stars_iterations: { val: 1, def: 1, name : "Extra smaller stars iterations", type : 'I' },
      extra_apply_no_copy_image: { val: false, def: false, name : "Apply no copy image", type : 'B' },
      extra_rotate: { val: false, def: false, name : "Extra rotate", type : 'B' },
      extra_rotate_degrees: { val: '180', def: '180', name : "Extra rotate degrees", type : 'S' },
      extra_color_calibration: { val: false, def: false, name : "Extra color calibration", type : 'B' },
      extra_solve_image: { val: false, def: false, name : "Extra solve image", type : 'B' },
      extra_annotate_image: { val: false, def: false, name : "Extra annotate image", type : 'B' },
      extra_annotate_image_scale: { val: 4, def: 4, name : "Extra annotate image scale", type : 'B' },
      extra_ha_mapping: { val: false, def: false, name : "Extra ha mapping", type : 'B' },

      // Calibration settings
      debayer_pattern: { val: "Auto", def: "Auto", name : "Debayer", type : 'S' },
      banding_reduction: { val: false, def: false, name : "Banding reduction", type : 'B' },
      banding_reduction_protect_highlights: { val: false, def: false, name : "Banding reduction protect highlights", type : 'B' },
      banding_reduction_amount: { val: 1, def: 1, name : "Banding reduction amount", type : 'R' },
      extract_channel_mapping: { val: "None", def: "None", name : "Extract channel mapping", type : 'S' },
      create_superbias: { val: true, def: true, name : "Superbias", type : 'B' },
      bias_master_files: { val: false, def: false, name : "Bias master files", type : 'B' },
      pre_calibrate_darks: { val: false, def: false, name : "Pre-calibrate darks", type : 'B' },
      optimize_darks: { val: true, def: true, name : "Optimize darks", type : 'B' },
      dark_master_files: { val: false, def: false, name : "Dark master files", type : 'B' },
      flat_dark_master_files: { val: false, def: false, name : "Flat dark master files", type : 'B' },
      stars_in_flats: { val: false, def: false, name : "Stars in flats", type : 'B' },
      no_darks_on_flat_calibrate: { val: false, def: false, name : "Do not use darks on flats", type : 'B' },
      lights_add_manually: { val: false, def: false, name : "Add lights manually", type : 'B' },
      integrated_lights: { val: false, def: false, name : "Integrated lights", type : 'B' },
      flats_add_manually: { val: false, def: false, name : "Add flats manually", type : 'B' },
      flatdarks_add_manually: { val: false, def: false, name : "Add flat darks manually", type : 'B' },
      skip_blink: { val: false, def: false, name : "No blink", type : 'B' },
      auto_output_pedestal: { val: true, def: true, name : "Auto output pedestal", type : 'B' },
      output_pedestal: { val: 0, def: 0, name : "Output pedestal", type : 'B' },
      

      // Misc settings
      show_flowchart: { val: true, def: true, name : "Show flowchart", type : 'B', skip_reset: true },
      preview_autostf: { val: true, def: true, name : "Preview AutoSTF", type : 'B' },
      preview_resample: { val: false, def: false, name : "Preview resample", type : 'B' },
      preview_resample_target: { val: 2000, def: 2000, name : "Preview resample target", type : 'I' },

      // Old persistent settings, moved to generic settings
      start_with_empty_window_prefix: { val: false, def: false, name: "startWithEmptyPrefixName", type: 'B' }, // Do we always start with empty prefix
      use_manual_icon_column: { val: false, def: false, name: "manualIconColumn", type: 'B' }                  // Allow manual control of icon column
};

this.default_startup_image_name = "startup.jpg";

/*
      Parameters that are persistent and are saved to only Settings and
      restored only from Settings at the start.
      Note that there is another parameter set par which are saved to 
      process icon.
*/
this.ppar = {
      win_prefix: '',         // Current active window name prefix
      autocontinue_win_prefix: '', // AutoContinue window name prefix
      prefixArray: [],        // Array of prefix names and icon count, 
                              // every array element is [icon-column, prefix-name, icon-count]
      userColumnCount: -1,    // User set column position, if -1 use automatic column position
      lastDir: '',            // Last save or load dir, used as a default when dir is unknown
      savedVersion: "",       // Saved version of the script
      preview: {
            use_preview: true,            // Show image preview on dialog preview window
            side_preview_visible: true,   // Show image preview on the side of the dialog
            use_large_preview: true,      // Use large preview window
            preview_sizes: [],            // Array of [ screen_size, width, height ]
            preview_width: 0,             // Current preview width, default set in getPreviewSize.
            preview_height: 0,            // Current preview height, default set in getPreviewSize.
            side_preview_width: 0,        // Current side preview width, default set in getPreviewSize.
            side_preview_height: 0,       // Current side preview height, default set in getPreviewSize.
            show_histogram: true,         // Show histogram in preview window
            histogram_height: 0,          // Histogram height in preview window, default set in getPreviewSize.
            side_histogram_height: 0,     // Histogram height in side preview window, default set in getPreviewSize.
            black_background: false       // Use pure black as image background
      },
      use_single_column: false,     // deprecated, always false: show all options in a single column
      use_more_tabs: true,          // deprecated, always true: use more tabs for parameters and settings
      files_in_tab: true,           // deprecated, always true: show files in a tab
      show_startup_image: true,     // show startup image
      startup_image_name: this.default_startup_image_name
};

// Run results for testing
this.run_results = {
      processing_steps_file: '',    // file where processing steps were written
      final_image_file: '',         // final image file
      fatal_error: '',              // if non-empty, fatal error during processing
      testmode_log_name: ''         // test mode log file name
};

this.console_hidden = false;  // true if console is hidden

this.debayerPattern_values = [ "Auto", "RGGB", "BGGR", "GBRG", 
                               "GRBG", "GRGB", "GBGR", "RGBG", 
                               "BGRG", "None" ];
this.debayerPattern_enums = [ Debayer.prototype.Auto, Debayer.prototype.RGGB, Debayer.prototype.BGGR, Debayer.prototype.GBRG,
                              Debayer.prototype.GRBG, Debayer.prototype.GRGB, Debayer.prototype.GBGR, Debayer.prototype.RGBG,
                              Debayer.prototype.BGRG, Debayer.prototype.Auto ];

this.saved_measurements = null;
this.saved_measurements_sorted = null;

this.screen_width = 1680;      // This is updated in initialization
this.screen_height = 1050;     // This is updated in initialization

this.get_flowchart_data = false;    // true if we are running in flowchart mode
this.flowchartWindows = [];   // array of flowchart window ids
this.flowchartData = null;    // flowchart data
this.flowchartActiveId = 0;   // active flowchart id
this.flowchartOperationList = []; // array of flowchart operations
this.flowchart_image = null;  // flowchart image to save to file

this.run_auto_continue = false;
this.write_processing_log_file = true;  // if we fail very early we set this to false
this.shadow_clip_value = 0.01;

this.is_gc_process = true;          // true if we have GradientCorrection process available
this.is_mgc_process = true;         // true if we have MultiscaleGradientCorrection process available

this.outputRootDir = "";
this.openedLightsDirectories = []; // we keep track of directories where we have opened lights files
this.lightFileNames = null;
this.darkFileNames = null;
this.biasFileNames = null;
this.flatdarkFileNames = null;
this.flatFileNames = null;
this.best_ssweight = 0;
this.best_image = null;
this.user_selected_best_image = null;
this.user_selected_reference_image = [];  // array of [image, filter]
this.star_alignment_image = null;
this.exclusion_areas = {
      polygons: [],     // array of polygons for exclusion areas
      image_width: 0,   // image width for exclusion areas
      image_height: 0   // image height for exclusion areas
};

this.subframeselector_call_count = 0;     // number of times SubframeSelector was called, for debugging
this.substack_number = 0;

this.processed_channel_images = [];

this.extra_target_image = null;

this.processing_steps = "";
this.processing_errors = "";
this.processing_warnings = "";
this.extra_processing_info = [];    // extra processing info steps from last Apply, array of [ txt]
this.all_windows = [];
this.iconPoint = null;
this.iconStartRow = 0;   // Starting row for icons, AutoContinue start from non-zero position

this.lightFilterSet = null;
this.flatFilterSet = null;
this.flatDarkFilterSet = null;

// These are initialized by util.setDefaultDirs
this.AutoOutputDir = null;
this.AutoCalibratedDir = null;
this.AutoMasterDir = null;
this.AutoProcessedDir = null;

this.pages = {
      LIGHTS : 0,
      BIAS : 1,
      DARKS : 2,
      FLATS : 3,
      FLAT_DARKS : 4,
      END : 5
};

this.columnCount = 0;          // A column position
this.haveIconized = 0;

/* Possible start images for AutoContinue.
 * These are used to determine what images are available for AutoContinue.
 * The numbering order is important as we use it for comparison.
 */
this.start_images = {
      NONE : 0,
      RGB : 1,                  // Integrated RGB color image
      L_R_G_B : 2,              // Integrated channel images
      RGB_GC : 3,               // Gradient corrected integrated RGB color image
      L_R_G_B_GC : 4,           // Gradient corrected integrated channel images
      RGB_HT : 5,               // Histogram transformed RGB image
      L_RGB_HT : 6,             // Histogram transformed L+RGB image
      FINAL : 7,                // Final image
      CALIBRATE_ONLY : 8
};

this.temporary_windows = [];

// known window names
this.integration_LRGB_windows = [
      "Integration_L",  // must be first
      "Integration_R",
      "Integration_G",
      "Integration_B",
      "Integration_H",
      "Integration_S",
      "Integration_O"
];

this.integration_color_windows = [
      "Integration_RGB"
];

this.integration_data_windows = [
      "LowRejectionMap_ALL",
      "AutoBackgroundModel"
];

// Intermediate windows checked before AutoContinue.
// These should not exist before AutoContinue.
this.intermediate_windows = [
      "Integration_L_processed",
      "Integration_RGB_processed",
      "Integration_RGB_combined",
      "Integration_L_HT",
      "Integration_RGB_HT",
      "Integration_LRGB_HT"
];

this.fixed_windows = [
      "Mapping_L",
      "Mapping_R",
      "Mapping_G",
      "Mapping_B",
      "Integration_RGB",
      "Integration_L_NB",
      "Integration_R_NB",
      "Integration_G_NB",
      "Integration_B_NB",
      "Integration_H_NB",
      "Integration_S_NB",
      "Integration_O_NB",
      // "Integration_RGB_narrowband",
      // "Integration_L_start",
      // "Integration_RGB_start",
      "Integration_L_crop",
      "Integration_L_processed",
      "Integration_L_NB_processed",
      "Integration_RGB_processed",
      "Integration_RGB_NB_processed",
      "Integration_RGB_combined",
      "Integration_L_HT",
      "Integration_L_NB_HT",
      "Integration_RGB_HT",
      "Integration_RGB_NB_HT",
      "copy_Integration_RGB_HT",
      "copy_Integration_RGB_NB_HT",
      "Integration_LRGB_HT",
      "Integration_LRGB_NB_HT",
      "copy_Integration_LRGB_HT",
      "copy_Integration_LRGB_NB_HT",
      "AutoMask",
      "AutoStarMask",
      "AutoStarFixMask",
      "SubframeSelector",
      "Measurements",
      "Expressions",
      "L_win_mask",
      "Integration_L_map_processed",
      "Integration_L_map_HT",
      "Integration_L_map_pm_processed",
      "Integration_L_map_pm_noGC",
      "Integration_L_map_pm_HT"
];

this.calibrate_windows = [
      "AutoMasterBias",
      "AutoMasterSuperBias",
      "AutoMasterFlatDark_L",
      "AutoMasterFlatDark_R",
      "AutoMasterFlatDark_G",
      "AutoMasterFlatDark_B",
      "AutoMasterFlatDark_H",
      "AutoMasterFlatDark_S",
      "AutoMasterFlatDark_O",
      "AutoMasterFlatDark_C",
      "AutoMasterDark",
      "AutoMasterFlat_L",
      "AutoMasterFlat_R",
      "AutoMasterFlat_G",
      "AutoMasterFlat_B",
      "AutoMasterFlat_H",
      "AutoMasterFlat_S",
      "AutoMasterFlat_O",
      "AutoMasterFlat_C"
];

/* Final processed window names, depending on input data and options used.
 * These may have Drizzle prefix if that option is used.
 */
this.final_windows = [
      "AutoLRGB",
      "AutoRRGB",
      "AutoRGB",
      "AutoMono"
];

this.test_image_ids = [];      // Test images

// Available narrowband palettes.
// Description of the fields
//    name - name of the palette:
//    R, G, B - channel expressions for the palette
//    all - If true this palette is created if All is selected in the UI
//    checkable - If true then the palette can be checked with multiple mappings in the UI
//    sho_mappable - If true the palette can be used in SHO mapping in the extra processing
//    stretched - True if the palette should be stretched before combing to RGB, like dynamic palettes
this.narrowBandPalettes = [
      { name: "Auto", R: "Auto", G: "Auto", B: "Auto", all: false, checkable: false, sho_mappable: false, stretched: false },
      { name: "SHO", R: "S", G: "H", B: "O", all: true, checkable: true, sho_mappable: false, stretched: false },
      { name: "HOS", R: "H", G: "O", B: "S", all: true, checkable: true, sho_mappable: true, stretched: false }, 
      { name: "HSO", R: "H", G: "S", B: "O", all: true, checkable: true, sho_mappable: true, stretched: false }, 
      { name: "OHS", R: "O", G: "H", B: "S", all: true, checkable: true, sho_mappable: true, stretched: false }, 
      { name: "HOO", R: "H", G: "O", B: "O", all: true, checkable: true, sho_mappable: true, stretched: false }, 
      { name: "Pseudo RGB", R: "0.75*H + 0.25*S", G: "0.50*S + 0.50*O", B: "0.30*H + 0.70*O", all: true, checkable: true, sho_mappable: true, stretched: false }, 
      { name: "Natural HOO", R: "H", G: "0.8*O+0.2*H", B: "0.85*O + 0.15*H", all: true, checkable: true, sho_mappable: true, stretched: false }, 
      { name: "3-channel HOO", R: "0.76*H+0.24*S", G: "O", B: "0.85*O + 0.15*H", all: true, checkable: true, sho_mappable: true, stretched: false }, 
      { name: "Dynamic SHO", R: "(O^~O)*S + ~(O^~O)*H", G: "((O*H)^~(O*H))*H + ~((O*H)^~(O*H))*O", B: "O", all: true, checkable: true, sho_mappable: true, stretched: true }, 
      { name: "Dynamic HOO", R: "H", G: "((O*H)^~(O*H))*H + ~((O*H)^~(O*H))*O", B: "O", all: true, checkable: true, sho_mappable: true, stretched: true }, 
      { name: "max(R,H),G,B", R: "max(R, H)", G: "G", B: "B", all: false, checkable: true, sho_mappable: false, stretched: false }, 
      { name: "max(RGB,HOO)", R: "max(R, H)", G: "max(G, O)", B: "max(B, O)", all: false, checkable: true, sho_mappable: false, stretched: false }, 
      { name: "HOO Helix", R: "H", G: "(0.4*H)+(0.6*O)", B: "O", all: true, checkable: true, sho_mappable: true, stretched: false }, 
      { name: "HSO Mix 1", R: "0.4*H + 0.6*S", G: "0.7*H + 0.3*O", B: "O", all: true, checkable: true, sho_mappable: true, stretched: false }, 
      { name: "HSO Mix 2", R: "0.4*H + 0.6*S", G: "0.4*O + 0.3*H + 0.3*S", B: "O", all: true, checkable: true, sho_mappable: true, stretched: false }, 
      { name: "HSO Mix 3", R: "0.5*H + 0.5*S", G: "0.15*H + 0.85*O", B: "O", all: true, checkable: true, sho_mappable: true, stretched: false }, 
      { name: "HSO Mix 4", R: "0.5*H + 0.5*S", G: "0.5*H + 0.5*O", B: "O", all: true, checkable: true, sho_mappable: true, stretched: false }, 
      { name: "L-eXtreme SHO", R: "H", G: "0.5*H+0.5*max(S,O)", B: "max(S,O)", all: true, checkable: true, sho_mappable: true, stretched: false }, 
      { name: "RGB", R: "R", G: "G", B: "B", all: false, checkable: false, sho_mappable: false, stretched: false }, 
      { name: "User defined", R: "", G: "", B: "", all: false, checkable: false, sho_mappable: false, stretched: false },
      { name: "All", R: "All", G: "All", B: "All", all: false, checkable: false, sho_mappable: false, stretched: false }
];

// If narrowBandPalettes is Auto, we use these mappings to create
// the image.
this.narrowbandAutoMapping = [
      { input: ['L','R','G','B','H'], output: "max(R,H),G,B", check_ha_mapping: true, rgb_stars: false },
      { input: ['R','G','B','H'], output: "max(R,H),G,B", check_ha_mapping: true, rgb_stars: false },
      { input: ['H','O'], output: "HOO", check_ha_mapping: false, rgb_stars: false },
      { input: ['L','R','G','B','H','O'], output: "HOO", check_ha_mapping: false, rgb_stars: true },
      { input: ['R','G','B','H','O'], output: "HOO", check_ha_mapping: false, rgb_stars: true },
      { input: ['S','H','O'], output: "SHO", check_ha_mapping: false, rgb_stars: false },
      { input: ['L','R','G','B','S','H','O'], output: "SHO", check_ha_mapping: false, rgb_stars: true },
      { input: ['R','G','B','S','H','O'], output: "SHO", check_ha_mapping: false, rgb_stars: true }
];

this.getDirectoryInfo = function(simple_text) {
      var header = "<p>AutoIntegrate output files go to the following subdirectories:</p>";
      var info = [
            "AutoProcessed contains processed final images. Also integrated images and log output is here.",
            "AutoOutput contains intermediate files generated during processing",
            "AutoMaster contains generated master calibration files",
            "AutoCalibrated contains calibrated light files"
      ];
      if (simple_text) {
            return header + "\n" + info.join('\n');
      } else {
            return "<p>" + header + "</p>" + "<ul><li>" + info.join('</li><li>') + "</li></ul>";
      }
}

this.ai_use_persistent_module_settings = true;  // read some defaults from persistent module settings
this.testmode = false;                          // true if we are running in test mode
this.testmode_log = "";                         // output for test mode, if any, to testmode.log file

if (this.autointegrate_version.indexOf("test") > 0) {
      this.autointegrateinfo_link = "https://ruuth.xyz/test/AutoIntegrateInfo.html";
} else {
      this.autointegrateinfo_link = "https://ruuth.xyz/AutoIntegrateInfo.html";
}

}   /* AutoIntegrateGlobal*/

AutoIntegrateGlobal.prototype = new Object;
