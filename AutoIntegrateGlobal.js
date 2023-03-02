/*
    AutoIntegrate Global variables.

Copyright (c) 2018-2022 Jarmo Ruuth.

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
this.autointegrate_version = "AutoIntegrate v1.57.2 test6";       // Version, also updated into updates.xri
this.autointegrate_info = "CometAlignment, GUI updates";          // For updates.xri

this.pixinsight_version_str = "";   // PixInsight version string, e.g. 1.8.8.10
this.pixinsight_version_num = 0;    // PixInsight version number, e.h. 1080810

this.processingDate = null;

// GUI variables
this.tabStatusInfoLabel = null;         // For update processing status
this.sideStatusInfoLabel = null;        // For update processing status

this.do_not_read_settings = false;      // do not read Settings from persistent module settings
this.do_not_write_settings = false;     // do not write Settings to persistent module settings
this.use_preview = true;
this.is_processing = false;

this.cancel_processing = false;

this.LDDDefectInfo = [];                // { groupname: name,  defects: defects }

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
      skip_cosmeticcorrection: { val: false, def: false, name : "Cosmetic correction", type : 'B' },
      skip_subframeselector: { val: false, def: false, name : "SubframeSelector", type : 'B' },
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
      ABE_before_channel_combination: { val: false, def: false, name : "ABE before channel combination", type : 'B' },
      ABE_on_lights: { val: false, def: false, name : "ABE on light images", type : 'B' },
      use_ABE_on_L_RGB: { val: false, def: false, name : "Use ABE on L, RGB", type : 'B' },
      use_ABE_on_L_RGB_stretched: { val: false, def: false, name : "Use ABE on L, RGB stretched", type : 'B' },
      skip_color_calibration: { val: false, def: false, name : "No color calibration", type : 'B' },
      color_calibration_before_ABE: { val: false, def: false, name : "Color calibration before ABE", type : 'B' },
      use_spcc: { val: false, def: false, name : "Use SPCC for color calibration", type : 'B' },
      use_background_neutralization: { val: false, def: false, name : "Background neutralization", type : 'B' },
      use_imageintegration_ssweight: { val: false, def: false, name : "ImageIntegration use SSWEIGHT", type : 'B' },
      skip_noise_reduction: { val: false, def: false, name : "No noise reduction", type : 'B' },
      skip_star_noise_reduction: { val: false, def: false, name : "No star noise reduction", type : 'B' },
      skip_mask_contrast: { val: false, def: false, name : "No mask contrast", type : 'B' },
      skip_sharpening: { val: false, def: false, name : "No sharpening", type : 'B' },
      skip_SCNR: { val: false, def: false, name : "No SCNR", type : 'B' },
      shadow_clip: { val: false, def: false, name : "Shadow clip", type : 'B' },
      force_new_mask: { val: false, def: false, name : "Force new mask", type : 'B' },
      crop_to_common_area: { val: false, def: false, name : "Crop to common area", type : 'B' },
      unscreen_stars: { val: false, def: false, name : "Unscreen stars", type : 'B' },

      // Other parameters
      calibrate_only: { val: false, def: false, name : "Calibrate only", type : 'B' },
      image_weight_testing: { val: false, def: false, name : "Image weight testing", type : 'B' },
      debayer_only: { val: false, def: false, name : "Debayer only", type : 'B' },
      binning_only: { val: false, def: false, name : "Binning only", type : 'B' },
      extract_channels_only: { val: false, def: false, name : "Extract channels only", type : 'B' },
      integrate_only: { val: false, def: false, name : "Integrate only", type : 'B' },
      channelcombination_only: { val: false, def: false, name : "ChannelCombination only", type : 'B' },
      cropinfo_only: { val: false, def: false, name : "Crop info only", type : 'B' },
      RRGB_image: { val: false, def: false, name : "RRGB", type : 'B' },
      batch_mode: { val: false, def: false, name : "Batch mode", type : 'B' },
      skip_autodetect_filter: { val: false, def: false, name : "Do not autodetect FILTER keyword", type : 'B' },
      skip_autodetect_imagetyp: { val: false, def: false, name : "Do not autodetect IMAGETYP keyword", type : 'B' },
      select_all_files: { val: false, def: false, name : "Select all files", type : 'B' },
      save_all_files: { val: false, def: false, name : "Save all files", type : 'B' },
      save_processed_channel_images: { val: false, def: false, name : "Save processed channel images", type : 'B' },
      no_subdirs: { val: false, def: false, name : "No subdirectories", type : 'B' },
      use_drizzle: { val: false, def: false, name : "Drizzle", type : 'B' },
      keep_integrated_images: { val: false, def: false, name : "Keep integrated images", type : 'B' },
      reset_on_setup_load: { val: false, def: false, name : "Reset on setup load", type : 'B' },
      keep_temporary_images: { val: false, def: false, name : "Keep temporary images", type : 'B' },
      monochrome_image: { val: false, def: false, name : "Monochrome", type : 'B' },
      skip_imageintegration_clipping: { val: false, def: false, name : "No ImageIntegration clipping", type : 'B' },
      synthetic_l_image: { val: false, def: false, name : "Synthetic L", type : 'B' },
      synthetic_missing_images: { val: false, def: false, name : "Synthetic missing image", type : 'B' },
      force_file_name_filter: { val: false, def: false, name : "Use file name for filters", type : 'B' },
      unique_file_names: { val: false, def: false, name : "Unique file names", type : 'B' },
      use_starxterminator: { val: false, def: false, name : "Use StarXTerminator", type : 'B' },

      use_blurxterminator: { val: false, def: false, name : "Use BlurXTerminator", type : 'B' },
      bxt_sharpen_stars: { val: 0.25, def: 0.25, name : "BlurXTerminator sharpen stars", type : 'R' },
      bxt_adjust_halo: { val: 0.00, def: 0.00, name : "BlurXTerminator adjust halos", type : 'R' },
      bxt_sharpen_nonstellar: { val: 0.90, def: 0.90, name : "BlurXTerminator sharpen nonstellar", type : 'R' },
      bxt_psf: { val: 0, def: 0, name : "BlurXTerminator PSF", type : 'R' },
      bxt_image_psf: { val: false, def: false, name : "BlurXTerminator image PSF", type : 'B' },
      bxt_median_psf: { val: false, def: false, name : "BlurXTerminator median PSF", type : 'B' },
      bxt_correct_first: { val: false, def: false, name : "BlurXTerminator correct first", type : 'B' },
      
      use_noisexterminator: { val: false, def: false, name : "Use NoiseXTerminator", type : 'B' },
      use_starnet2: { val: false, def: false, name : "Use StarNet2", type : 'B' },
      win_prefix_to_log_files: { val: false, def: false, name : "Add window prefix to log files", type : 'B' },
      start_from_imageintegration: { val: false, def: false, name : "Start from ImageIntegration", type : 'B' },
      generate_xdrz: { val: false, def: false, name : "Generate .xdrz files", type : 'B' },
      autosave_setup: { val: false, def: false, name: "Autosave setup", type: 'B' },
      use_processed_files: { val: false, def: false, name: "Use processed files", type: 'B' },
      save_cropped_images: { val: false, def: false, name: "Save cropped images", type: 'B' },

      // Narrowband processing
      narrowband_mapping: { val: 'SHO', def: 'SHO', name : "Narrowband mapping", type : 'S' },
      custom_R_mapping: { val: 'S', def: 'S', name : "Narrowband R mapping", type : 'S' },
      custom_G_mapping: { val: 'H', def: 'H', name : "Narrowband G mapping", type : 'S' },
      custom_B_mapping: { val: 'O', def: 'O', name : "Narrowband B mapping", type : 'S' },
      custom_L_mapping: { val: '', def: '', name : "Narrowband L mapping", type : 'S' },
      narrowband_linear_fit: { val: 'Auto', def: 'Auto', name : "Narrowband linear fit", type : 'S' },
      mapping_on_nonlinear_data: { val: false, def: false, name : "Narrowband mapping on non-linear data", type : 'B' },
      force_narrowband_mapping: { val: false, def: false, name : "Force narrowband mapping", type : 'B' },
      remove_stars_before_stretch: { val: false, def: false, name : "Remove stars early", type : 'B' },
      remove_stars_light: { val: false, def: false, name : "Remove stars light", type : 'B' },
      remove_stars_channel: { val: false, def: false, name : "Remove stars channel", type : 'B' },
      remove_stars_stretched: { val: false, def: false, name : "Remove stars stretched", type : 'B' },
      use_narrowband_multiple_mappings: { val: false, def: false, name : "Use narrowband multiple mappings", type : 'B' },
      narrowband_multiple_mappings_list: { val: "", def: "", name : "Narrowband multiple mappings list", type : 'S' },

      // Narrowband to RGB mapping
      use_RGBNB_Mapping: { val: false, def: false, name : "Narrowband RGB mapping", type : 'B' },
      use_RGB_image: { val: false, def: false, name : "Narrowband RGB mapping use RGB", type : 'B' },
      L_mapping: { val: '',  def: '',  name : "Narrowband RGB mapping for L", type : 'S' },
      R_mapping: { val: 'H', def: 'H', name : "Narrowband RGB mapping for R", type : 'S' },
      G_mapping: { val: 'O', def: 'O', name : "Narrowband RGB mapping for G", type : 'S' },
      B_mapping: { val: 'O', def: 'O', name : "Narrowband RGB mapping for B", type : 'S' },
      L_BoostFactor: { val: 1.2, def: 1.2, name : "Narrowband RGB mapping L boost factor", type : 'R' },
      R_BoostFactor: { val: 1.2, def: 1.2, name : "Narrowband RGB mapping R boost factor", type : 'R' },
      G_BoostFactor: { val: 1.2, def: 1.2, name : "Narrowband RGB mapping G boost factor", type : 'R' },
      B_BoostFactor: { val: 1.2, def: 1.2, name : "Narrowband RGB mapping B boost factor", type : 'R' },
      L_bandwidth: { val: 100, def: 100, name : "Narrowband RGB mapping L bandwidth", type : 'R' },
      R_bandwidth: { val: 100, def: 100, name : "Narrowband RGB mapping R bandwidth", type : 'R' },
      G_bandwidth: { val: 100, def: 100, name : "Narrowband RGB mapping G bandwidth", type : 'R' },
      B_bandwidth: { val: 100, def: 100, name : "Narrowband RGB mapping B bandwidth", type : 'R' },
      H_bandwidth: { val: 3, def: 3, name : "Narrowband RGB mapping H bandwidth", type : 'R' },
      S_bandwidth: { val: 3, def: 3, name : "Narrowband RGB mapping S bandwidth", type : 'R' },
      O_bandwidth: { val: 3, def: 3, name : "Narrowband RGB mapping O bandwidth", type : 'R' },

      // Processing settings
      channel_noise_reduction: { val: true, def: true, name : "Channel noise reduction", type : 'B' },
      non_linear_noise_reduction: { val: false, def: false, name : "Non-linear noise reduction", type : 'B' },
      noise_reduction_strength: { val: 3, def: 3, name : "Noise reduction strength", type : 'I' },
      luminance_noise_reduction_strength: { val: 3, def: 3, name : "Noise reduction strength on luminance image", type : 'I' },
      combined_image_noise_reduction: { val: false, def: false, name : "Do noise reduction on combined image", type : 'B' },
      use_color_noise_reduction: { val: false, def: false, name : "Color noise reduction", type : 'B' },
      ACDNR_noise_reduction: { val: 1.0, def: 1.0, name : "ACDNR noise reduction", type : 'R' },
      use_weight: { val: 'PSF Signal', def: 'PSF Signal', name : "Weight calculation", type : 'S' },
      ssweight_limit: { val: 0, def: 0, name : "SSWEIGHT limit", type : 'R' },
      filter_limit1_type: { val: 'None', def: 'None', name : "Filter limit 1 type", type : 'S' },
      filter_limit1_val: { val: 0, def: 0, name : "Filter limit 1 value", type : 'R' },
      filter_limit2_type: { val: 'None', def: 'None', name : "Filter limit 2 type", type : 'S' },
      filter_limit2_val: { val: 0, def: 0, name : "Filter limit 2 value", type : 'R' },
      outliers_ssweight: { val: false, def: false, name : "Outliers SSWEIGHT", type : 'B' },
      outliers_fwhm: { val: false, def: false, name : "Outliers FWHM", type : 'B' },
      outliers_ecc: { val: false, def: false, name : "Outliers eccentricity", type : 'B' },
      outliers_snr: { val: false, def: false, name : "Outliers SNR", type : 'B' },
      outliers_psfsignal: { val: false, def: false, name : "Outliers PSF Signal", type : 'B' },
      outliers_psfpower: { val: false, def: false, name : "Outliers PSF Power", type : 'B' },
      outliers_stars: { val: false, def: false, name : "Outliers Stars", type : 'B' },
      outliers_method: { val: 'Two sigma', def: 'Two sigma', name : "Outlier method", type : 'S' },
      outliers_minmax: { val: false, def: false, name : "Outlier min max", type : 'B' },
      use_linear_fit: { val: 'Luminance', def: 'Luminance', name : "Linear fit", type : 'S' },
      image_stretching: { val: 'Auto STF', def: 'Auto STF', name : "Image stretching", type : 'S' },
      stars_stretching: { val: 'Arcsinh Stretch', def: 'Arcsinh Stretch', name : "Stars stretching", type : 'S' },
      stars_combine: { val: 'Screen', def: 'Screen', name : "Stars combine", type : 'S' },
      STF_linking: { val: 'Auto', def: 'Auto', name : "RGB channel linking", type : 'S' },
      imageintegration_normalization: { val: 'Additive', def: 'Additive', name : "ImageIntegration Normalization", type : 'S' },
      use_clipping: { val: 'Auto2', def: 'Auto2', name : "ImageIntegration rejection", type : 'S' },

      target_type_galaxy: { val: false, def: false, name : "Target type galaxy", type : 'B' },
      target_type_nebula: { val: false, def: false, name : "Target type nebula", type : 'B' },

      percentile_low: { val: 0.2, def: 0.2, name : "Percentile low", type : 'R' },
      percentile_high: { val: 0.1, def: 0.1, name : "Percentile high", type : 'R' },
      sigma_low: { val: 4.0, def: 4.0, name : "Sigma low", type : 'R' },
      sigma_high: { val: 3.0, def: 3.0, name : "Sigma high", type : 'R' },
      winsorised_cutoff: { val: 5.0, def: 5.0, name : "Winsorised cutoff", type : 'R' },
      linearfit_low: { val: 5.0, def: 5.0, name : "Linear fit low", type : 'R' },
      linearfit_high: { val: 4.0, def: 4.0, name : "Linear fit high", type : 'R' },
      ESD_outliers: { val: 0.3, def: 0.3, name : "ESD outliers", type : 'R' },
      ESD_significance: { val: 0.05, def: 0.05, name : "ESD significance", type : 'R' },
      // ESD_lowrelaxation: { val: 1.50, def: 1.50, name : "ESD low relaxation", type : 'R' }, deprecated, use default for old version
      use_localnormalization_multiscale: { val: false, def: false, name : "Use LocalNormalization Mmultiscale", type : 'B' },

      cosmetic_correction_hot_sigma: { val: 3, def: 3, name : "CosmeticCorrection hot sigma", type : 'I' },
      cosmetic_correction_cold_sigma: { val: 3, def: 3, name : "CosmeticCorrection cold sigma", type : 'I' },
      STF_targetBackground: { val: 0.25, def: 0.25, name : "STF targetBackground", type : 'R' },    
      MaskedStretch_targetBackground: { val: 0.125, def: 0.125, name : "Masked Stretch targetBackground", type : 'R' },    
      Arcsinh_stretch_factor: { val: 50, def: 50, name : "Arcsinh Stretch Factor", type : 'R' },    
      Arcsinh_black_point: { val: 0.01, def: 0.01, name : "Arcsinh Stretch black point", type : 'I' }, 
      Arcsinh_iterations: { val: 3, def: 3, name : "Arcsinh Stretch iterations", type : 'I' }, 
      LRGBCombination_lightness: { val: 0.5, def: 0.5, name : "LRGBCombination lightness", type : 'R' },    
      LRGBCombination_saturation: { val: 0.5, def: 0.5, name : "LRGBCombination saturation", type : 'R' },    
      linear_increase_saturation: { val: 1, def: 1, name : "Linear saturation increase", type : 'I' },    
      non_linear_increase_saturation: { val: 1, def: 1, name : "Non-linear saturation increase", type : 'I' },    
      Hyperbolic_D: { val: 5, def: 5, name : "Hyperbolic Stretch D value", type : 'I' },
      Hyperbolic_b: { val: 8, def: 8, name : "Hyperbolic Stretch b value", type : 'I' }, 
      Hyperbolic_SP: { val: 10, def: 10, name : "Hyperbolic Stretch symmetry point value", type : 'I' }, 
      Hyperbolic_target: { val: 0.25, def: 0.25, name : "Hyperbolic Stretch target", type : 'I' }, 
      Hyperbolic_iterations: { val: 10, def: 10, name : "Hyperbolic Stretch iterations", type : 'I' }, 
      Hyperbolic_mode: { val: 1, def: 1, name : "Hyperbolic Stretch mode", type : 'I' }, 
      histogram_shadow_clip: { val: 0.00, def: 0.00, name : "Histogram shadow clip", type : 'I' }, 
      histogram_stretch_type: { val: 'Median', def: 'Median', name : "Histogram stretch type", type : 'S' }, 
      histogram_stretch_target: { val: 0.25, def: 0.25, name : "Histogram stretch target", type : 'I' }, 
      smoothbackground: { val: 0, def: 0, name : "Smooth background", type : 'R' },
      target_name: { val: '', def: '', name : "Target name", type : 'S' }, 
      target_radec: { val: '', def: '', name : "Target RA/DEC", type : 'S' }, 
      target_focal: { val: '', def: '', name : "Target focal length", type : 'S' }, 
      target_pixel_size: { val: '', def: '', name : "Target pixel size", type : 'S' }, 
      spcc_detection_scales: { val: 5, def: 5, name : "SPCC detection scales", type : 'I' }, 
      spcc_noise_scales: { val: 1, def: 1, name : "SPCC noise scales", type : 'I' }, 
      spcc_min_struct_size: { val: 0, def: 0, name : "SPCC min struct size", type : 'I' }, 

      // Extra processing for narrowband
      run_orange_hue_shift: { val: false, def: false, name : "Extra narrowband more orange", type : 'B' },
      run_hue_shift: { val: false, def: false, name : "Extra narrowband hue shift", type : 'B' },
      leave_some_green: { val: false, def: false, name : "Extra narrowband leave some green", type : 'B' },
      leave_some_green_amount: { val: 0.50, def: 0.50, name : "Extra narrowband leave some green amount", type : 'R' },
      run_narrowband_SCNR: { val: false, def: false, name : "Extra narrowband remove green", type : 'B' },
      remove_magenta_color: { val: false, def: false, name : "Extra remove magenta color", type : 'B' },
      fix_narrowband_star_color: { val: false, def: false, name : "Extra narrowband fix star colors", type : 'B' },
      skip_star_fix_mask: { val: false, def: false, name : "Extra narrowband no star mask", type : 'B' },

      // Generic Extra processing
      extra_remove_stars: { val: false, def: false, name : "Extra remove stars", type : 'B' },
      extra_unscreen_stars: { val: false, def: false, name : "Extra unscreen stars", type : 'B' },
      extra_combine_stars: { val: false, def: false, name : "Extra combine starless and stars", type : 'B' },
      extra_combine_stars_mode: { val: 'Screen', def: 'Screen', name : "Extra remove stars combine", type : 'S' },
      extra_combine_stars_image: { val: 'Auto', def: 'Auto', name : "Extra stars image", type : 'S' },
      extra_combine_stars_reduce: { val: 'None', def: 'None', name : "Extra combine stars reduce", type : 'S' },
      extra_combine_stars_reduce_S: { val: 0.15, def: 0.15, name : "Extra combine stars reduce S", type : 'R' },
      extra_combine_stars_reduce_M: { val: 1, def: 1, name : "Extra combine stars reduce M", type : 'R' },
      extra_ABE: { val: false, def: false, name : "Extra ABE", type : 'B' },
      extra_darker_background: { val: false, def: false, name : "Extra Darker background", type : 'B' },
      extra_ET: { val: false, def: false, name : "Extra ExponentialTransformation", type : 'B' },
      extra_ET_order: { val: 1.0, def: 1.0, name : "Extra ExponentialTransformation Order", type : 'I' },
      extra_HDRMLT: { val: false, def: false, name : "Extra HDRMLT", type : 'B' },
      extra_HDRMLT_layers: { val: 6, def: 6, name : "Extra HDRMLT layers", type : 'I' },
      extra_HDRMLT_color: { val: 'None', def: 'None', name : "Extra HDRMLT hue", type : 'S' },
      extra_LHE: { val: false, def: false, name : "Extra LHE", type : 'B' },
      extra_LHE_kernelradius: { val: 110, def: 110, name : "Extra LHE kernel radius", type : 'I' },
      extra_contrast: { val: false, def: false, name : "Extra contrast", type : 'B' },
      extra_contrast_iterations: { val: 1, def: 1, name : "Extra contrast iterations", type : 'I' },
      extra_stretch: { val: false, def: false, name : "Extra stretch", type : 'B' },
      extra_shadowclipping: { val: false, def: false, name : "Extra shadow clipping", type : 'B' },
      extra_shadowclippingperc: { val: 0.01, def: 0.01, name : "Extra shadow clipping percentage", type : 'R' },
      extra_smoothbackground: { val: false, def: false, name : "Extra smooth background", type : 'B' },
      extra_smoothbackgroundval: { val: 0.01, def: 0.01, name : "Extra smooth background value", type : 'R' },
      extra_force_new_mask: { val: false, def: false, name : "Extra force new mask", type : 'B' },
            
      extra_noise_reduction: { val: false, def: false, name : "Extra noise reduction", type : 'B' },
      extra_noise_reduction_strength: { val: 3, def: 3, name : "Extra noise reduction strength", type : 'I' },
      extra_ACDNR: { val: false, def: false, name : "Extra ACDNR noise reduction", type : 'B' },
      extra_color_noise: { val: false, def: false, name : "Extra color noise reduction", type : 'B' },
      extra_star_noise_reduction: { val: false, def: false, name : "Extra star noise reduction", type : 'B' },
      extra_sharpen: { val: false, def: false, name : "Extra sharpen", type : 'B' },
      extra_sharpen_iterations: { val: 1, def: 1, name : "Extra sharpen iterations", type : 'I' },
      extra_unsharpmask: { val: false, def: false, name : "Extra unsharpmask", type : 'B' },
      extra_unsharpmask_stddev: { val: 4, def: 4, name : "Extra unsharpmask stddev", type : 'I' },
      extra_saturation: { val: false, def: false, name : "Extra saturation", type : 'B' },
      extra_saturation_iterations: { val: 1, def: 1, name : "Extra saturation iterations", type : 'I' },
      extra_smaller_stars: { val: false, def: false, name : "Extra smaller stars", type : 'B' },
      extra_smaller_stars_iterations: { val: 1, def: 1, name : "Extra smaller stars iterations", type : 'I' },
      extra_apply_no_copy_image: { val: false, def: false, name : "Apply no copy image", type : 'B' },

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
      skip_blink: { val: false, def: false, name : "No blink", type : 'B' },

      // Old persistent settings, moved to generic settings
      start_with_empty_window_prefix: { val: false, def: false, name: "startWithEmptyPrefixName", type: 'B' }, // Do we always start with empty prefix
      use_manual_icon_column: { val: false, def: false, name: "manualIconColumn", type: 'B' }                  // Allow manual control of icon column
};

/*
      Parameters that are persistent and are saved to only Settings and
      restored only from Settings at the start.
      Note that there is another parameter set par which are saved to 
      process icon.
*/
this.ppar = {
      win_prefix: '',         // Current active window name prefix
      prefixArray: [],        // Array of prefix names and icon count, 
                              // every array element is [icon-column, prefix-name, icon-count]
      userColumnCount: -1,    // User set column position, if -1 use automatic column position
      lastDir: '',            // Last save or load dir, used as a default when dir is unknown
      preview: {
            use_preview: true,            // Show image preview on dialog preview window
            side_preview_visible: false,  // Show image preview on the side of the dialog
            use_large_preview: false,     // Use large preview window
            preview_sizes: [],            // Array of [ screen_size, width, height ]
            preview_width: 0,             // Current preview width.
            preview_height: 0             // Current preview height.
      },
      use_single_column: false, // show all options in a single column
      use_more_tabs: false     // use more tabs for parameters and settings
};

// Run results for testing
this.run_results = {
      processing_steps_file: '',    // file where processing steps were written
      final_image_file: '',         // final image file
      fatal_error: ''               // if non-empty, fatal error during processing
};

this.debayerPattern_values = [ "Auto", "RGGB", "BGGR", "GBRG", 
                               "GRBG", "GRGB", "GBGR", "RGBG", 
                               "BGRG", "None" ];
this.debayerPattern_enums = [ Debayer.prototype.Auto, Debayer.prototype.RGGB, Debayer.prototype.BGGR, Debayer.prototype.GBRG,
                              Debayer.prototype.GRBG, Debayer.prototype.GRGB, Debayer.prototype.GBGR, Debayer.prototype.RGBG,
                              Debayer.prototype.BGRG, Debayer.prototype.Auto ];

this.saved_measurements = null;

this.run_auto_continue = false;
this.write_processing_log_file = true;  // if we fail very early we set this to false
this.shadow_clip_value = 0.01;

this.outputRootDir = "";
this.lightFileNames = null;
this.darkFileNames = null;
this.biasFileNames = null;
this.flatdarkFileNames = null;
this.flatFileNames = null;
this.best_ssweight = 0;
this.best_image = null;
this.user_selected_best_image = null;
this.user_selected_reference_image = [];
this.star_alignment_image = null;

this.processed_channel_images = [];

this.extra_target_image = null;

this.processing_steps = "";
this.all_windows = [];
this.iconPoint = null;
this.iconStartRow = 0;   // Starting row for icons, AutoContinue start from non-zero position

this.lightFilterSet = null;
this.flatFilterSet = null;

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

this.start_images = {
    NONE : 0,
    L_R_G_B_BE : 1,
    L_RGB_BE : 2,
    RGB_BE : 3,
    L_RGB_HT : 4,
    RGB_HT : 5,
    RGB_COLOR : 6,
    L_R_G_B_PROCESSED : 7,
    L_R_G_B : 8,
    L_RGB : 9,
    RGB : 10,
    FINAL : 11,
    CALIBRATE_ONLY : 12
};

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

this.integration_processed_channel_windows = [
      "Integration_L_processed",
      "Integration_R_processed",
      "Integration_G_processed",
      "Integration_B_processed",
      "Integration_H_processed",
      "Integration_S_processed",
      "Integration_O_processed"
];

this.integration_color_windows = [
      "Integration_RGB_color"
];

this.integration_crop_windows = [
      "LowRejectionMap_ALL"
];

this.fixed_windows = [
      "Mapping_L",
      "Mapping_R",
      "Mapping_G",
      "Mapping_B",
      "Integration_RGB",
      // "Integration_RGB_narrowband",
      // "Integration_L_start",
      // "Integration_RGB_start",
      "Integration_L_crop",
      "Integration_L_ABE",
      "Integration_R_ABE",
      "Integration_G_ABE",
      "Integration_B_ABE",
      "Integration_RGB_ABE",
      "Integration_L_BE",
      "Integration_R_BE",
      "Integration_G_BE",
      "Integration_B_BE",
      "Integration_RGB_BE",
      "Integration_L_ABE_HT",
      "Integration_RGB_ABE_HT",
      "Integration_L_BE_HT",
      "Integration_RGB_BE_HT",
      "copy_Integration_RGB_ABE_HT",
      "Integration_RGB_ABE_NB_HT",
      "copy_Integration_RGB_ABE_NB_HT",
      "Integration_LRGB_ABE_HT",
      "copy_Integration_LRGB_ABE_HT",
      "Integration_L_noABE",
      "Integration_R_noABE",
      "Integration_G_noABE",
      "Integration_B_noABE",
      "Integration_RGB_noABE",
      "Integration_RGB_noABE_NB",
      "Integration_L_noABE_HT",
      "Integration_L_noABE_NB",
      "Integration_L_noABE_NB_HT",
      "Integration_RGB_noABE_HT",
      "copy_Integration_RGB_noABE_HT",
      "Integration_RGB_noABE_NB_HT",
      "Integration_LRGB_noABE_HT",
      "copy_Integration_LRGB_noABE_HT",
      "Integration_LRGB_noABE_NB_HT",
      "copy_Integration_LRGB_noABE_NB_HT",
      // "L_BE_HT",
      // "RGB_BE_HT",
      "AutoMask",
      "AutoStarMask",
      "AutoStarFixMask",
      "SubframeSelector",
      "Measurements",
      "Expressions",
      "L_win_mask",
      "Integration_L_map_ABE",
      "Integration_L_map_ABE_HT",
      "Integration_L_map_pm_ABE",
      "Integration_L_map_pm_noABE",
      "Integration_L_map_pm_ABE_HT",
      "Integration_L_map_pm_noABE_HT"
];

this.calibrate_windows = [
      "AutoMasterBias",
      "AutoMasterSuperBias",
      "AutoMasterFlatDark",
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

this.narrowBandPalettes = [
      { name: "SHO", R: "S", G: "H", B: "O", all: true, checkable: true }, 
      { name: "HOS", R: "H", G: "O", B: "S", all: true, checkable: true }, 
      { name: "HSO", R: "H", G: "S", B: "O", all: true, checkable: true }, 
      { name: "OHS", R: "O", G: "H", B: "S", all: true, checkable: true }, 
      { name: "HOO", R: "H", G: "O", B: "O", all: true, checkable: true }, 
      { name: "Pseudo RGB", R: "0.75*H + 0.25*S", G: "0.50*S + 0.50*O", B: "0.30*H + 0.70*O", all: true, checkable: true }, 
      { name: "Natural HOO", R: "H", G: "0.8*O+0.2*H", B: "0.85*O + 0.15*H", all: true, checkable: true }, 
      { name: "3-channel HOO", R: "0.76*H+0.24*S", G: "O", B: "0.85*O + 0.15*H", all: true, checkable: true }, 
      { name: "Dynamic SHO", R: "(O^~O)*S + ~(O^~O)*H", G: "((O*H)^~(O*H))*H + ~((O*H)^~(O*H))*O", B: "O", all: true, checkable: true }, 
      { name: "Dynamic HOO", R: "H", G: "((O*H)^~(O*H))*H + ~((O*H)^~(O*H))*O", B: "O", all: true, checkable: true }, 
      { name: "max(RGB,H)", R: "max(R, H)", G: "G", B: "B", all: false, checkable: true }, 
      { name: "max(RGB,HOO)", R: "max(R, H)", G: "max(G, O)", B: "max(B, O)", all: false, checkable: true }, 
      { name: "HOO Helix", R: "H", G: "(0.4*H)+(0.6*O)", B: "O", all: true, checkable: true }, 
      { name: "HSO Mix 1", R: "0.4*H + 0.6*S", G: "0.7*H + 0.3*O", B: "O", all: true, checkable: true }, 
      { name: "HSO Mix 2", R: "0.4*H + 0.6*S", G: "0.4*O + 0.3*H + 0.3*S", B: "O", all: true, checkable: true }, 
      { name: "HSO Mix 3", R: "0.5*H + 0.5*S", G: "0.15*H + 0.85*O", B: "O", all: true, checkable: true }, 
      { name: "HSO Mix 4", R: "0.5*H + 0.5*S", G: "0.5*H + 0.5*O", B: "O", all: true, checkable: true }, 
      { name: "L-eXtreme SHO", R: "H", G: "0.5*H+0.5*max(S,O)", B: "max(S,O)", all: true, checkable: true }, 
      { name: "RGB", R: "R", G: "G", B: "B", all: false, checkable: true }, 
      { name: "User defined", R: "", G: "", B: "", all: false, checkable: false },
      { name: "All", R: "All", G: "All", B: "All", all: false, checkable: false }
];

this.directoryInfo = "<p>AutoIntegrate output files go to the following subdirectories:</p>" +
                    "<ul>" +
                    "<li>AutoOutput contains intermediate files generated during processing</li>" +
                    "<li>AutoMaster contains generated master calibration files</li>" +
                    "<li>AutoCalibrated contains calibrated light files</li>" +
                    "<li>AutoProcessed contains processed final images. Also integrated images and log output is here.</li>" +
                    "<ul>";

// variables for temporary debugging and testing
this.ai_debug = false;                          // temp setting for debugging
this.ai_get_process_defaults = false;           // temp setting to print process defaults

this.ai_use_persistent_module_settings = true;  // read some defaults from persistent module settings

}   /* AutoIntegrateGlobal*/

AutoIntegrateGlobal.prototype = new Object;
