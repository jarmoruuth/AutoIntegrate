// AutoIntegrate Astro Image Metrics Visualizer Dialog
// For SubFrame Selector metrics visualization

// ============================================================================
// Tutorial Manager - Dialog to select and launch tutorials
// ============================================================================

function TutorialManagerDialog(parentDialog) {
      this.__base__ = Dialog;
      this.__base__();
      
      this.parentDialog = parentDialog;
      this.windowTitle = "AutoIntegrate Tutorials";
      this.minWidth = 500;
      this.minHeight = 400;

      this.useAdvancedOptions = false;
      
      // Title
      this.titleLabel = new Label(this);
      this.titleLabel.text = "Welcome to AutoIntegrate Tutorials";
      this.titleLabel.styleSheet = 
            "QLabel { " +
            "  font-size: 16px; " +
            "  font-weight: bold; " +
            "  color: #2C3E50; " +
            "  padding: 10px; " +
            "}";
      
      // Description
      this.descLabel = new Label(this);
      this.descLabel.text = "Select a tutorial to learn about AutoIntegrate features:";
      this.descLabel.wordWrapping = true;
      this.descLabel.styleSheet = "QLabel { padding: 5px 10px; color: #7F8C8D; }";
      
      // Tutorial list
      this.tutorialList = new TreeBox(this);
      this.tutorialList.alternateRowColor = true;
      this.tutorialList.setMinHeight(250);
      this.tutorialList.headerVisible = false;
      this.tutorialList.numberOfColumns = 1;
      
      var manager = this;
      this.tutorialList.onNodeDoubleClicked = function(node) {
            manager.launchSelectedTutorial();
      };
      
      // Populate tutorials
      this.populateTutorials();
      
      // Buttons
      this.startButton = new PushButton(this);
      this.startButton.text = "Start Tutorial";
      this.startButton.icon = this.scaledResource(":/icons/play.png");
      this.startButton.defaultButton = true;
      this.startButton.styleSheet = 
            "QPushButton { " +
            "  background: rgb(46, 204, 113); " +
            "  color: white; " +
            "  font-weight: bold; " +
            "  padding: 8px 20px; " +
            "}";
      this.startButton.onClick = function() {
            manager.launchSelectedTutorial();
      };
      
      this.closeButton = new PushButton(this);
      this.closeButton.text = "Close";
      this.closeButton.icon = this.scaledResource(":/icons/close.png");
      this.closeButton.onClick = function() {
            manager.cancel();
      };
      
      if (this.useAdvancedOptions) {
            // Mark as completed checkbox
            this.markCompletedCheckBox = new CheckBox(this);
            this.markCompletedCheckBox.checked = false;
            
            this.markCompletedLabel = new Label(this);
            this.markCompletedLabel.text = "Mark selected as completed";
            this.markCompletedLabel.cursor = new Cursor(StdCursor_PointingHand);
            this.markCompletedLabel.onMousePress = function() {
                  manager.markCompletedCheckBox.checked = !manager.markCompletedCheckBox.checked;
                  if (manager.markCompletedCheckBox.checked) {
                        manager.markSelectedAsCompleted();
                  }
            };
            
            var markCompletedSizer = new HorizontalSizer;
            markCompletedSizer.spacing = 4;
            markCompletedSizer.add(this.markCompletedCheckBox);
            markCompletedSizer.add(this.markCompletedLabel);
            markCompletedSizer.addStretch();
      }      
      // Button sizer
      var buttonSizer = new HorizontalSizer;
      buttonSizer.spacing = 6;
      buttonSizer.addStretch();
      buttonSizer.add(this.startButton);
      buttonSizer.add(this.closeButton);
      
      // Main layout
      this.sizer = new VerticalSizer;
      this.sizer.margin = 10;
      this.sizer.spacing = 10;
      this.sizer.add(this.titleLabel);
      this.sizer.add(this.descLabel);
      this.sizer.add(this.tutorialList, 100);
      if (this.useAdvancedOptions) {
            this.sizer.add(markCompletedSizer);
      }
      this.sizer.add(buttonSizer);
      
      this.adjustToContents();
}

TutorialManagerDialog.prototype = new Dialog;

// Define available tutorials
TutorialManagerDialog.prototype.getTutorials = function() {
      return [
        {
            id: "getting-started",
            name: "Getting Started",
            description: "Learn the basics of AutoIntegrate: adding files, configuring settings, and processing your first images.",
            difficulty: "Beginner",
            duration: "5 minutes",
            icon: "🚀"
        },
        {
            id: "file-management",
            name: "File Management",
            description: "Master organizing your light frames, calibration frames (bias, darks, flats), and output files.",
            difficulty: "Beginner",
            duration: "3 minutes",
            icon: "📁"
        },
        {
            id: "processing-settings",
            name: "Processing Settings",
            description: "Explore processing options including cropping, gradient correction and stretching.",
            difficulty: "Intermediate",
            duration: "7 minutes",
            icon: "⚙️"
        },
        {
            id: "comet-processing",
            name: "Comet Processing",
            description: "Learn how to process comet images using specialized techniques.",
            difficulty: "Advanced",
            duration: "10 minutes",
            icon: "☄️"
        }
      ];
};

// Populate the tutorial list
TutorialManagerDialog.prototype.populateTutorials = function() {
      this.tutorialList.clear();
      
      var tutorials = this.getTutorials();
      
      for (var i = 0; i < tutorials.length; i++) {
            var tutorial = tutorials[i];
            var isCompleted = this.isTutorialCompleted(tutorial.id);
            
            var node = new TreeBoxNode(this.tutorialList);
            
            // Format: Icon Name - Description
            if (this.useAdvancedOptions) {
                  var displayText = tutorial.icon + "  " + tutorial.name;
            } else {
                  var displayText = tutorial.name;
            }
            if (isCompleted) {
                  displayText = "✓ " + displayText + " (Completed)";
            }
            
            node.setText(0, displayText);
            node.tutorialId = tutorial.id;
            node.tutorialData = tutorial;
            
            if (this.useAdvancedOptions) {
                  // Style based on difficulty
                  if (isCompleted) {
                        node.setIcon(0, this.scaledResource(":/icons/ok.png"));
                  } else if (tutorial.difficulty === "Beginner") {
                        node.setIcon(0, this.scaledResource(":/icons/information.png"));
                  } else if (tutorial.difficulty === "Advanced") {
                        node.setIcon(0, this.scaledResource(":/icons/warning.png"));
                  }
            }            
            // Set tooltip with full info
            node.setToolTip(0, 
                  tutorial.name + "\n\n" +
                  tutorial.description + 
                  this.useAdvancedOptions 
                        ? "\n\n" +
                          "Difficulty: " + tutorial.difficulty + "\n" +
                          "Duration: " + tutorial.duration
                        : ""
            );
      }
      
      // Select first tutorial by default
      if (this.tutorialList.numberOfChildren > 0) {
            this.tutorialList.currentNode = this.tutorialList.child(0);
      }
};

// Check if tutorial is completed
TutorialManagerDialog.prototype.isTutorialCompleted = function(tutorialId) {
      if (this.useAdvancedOptions === false) {
            return false;
      }
      var key = "AutoIntegrate_Tutorial_" + tutorialId + "_Completed";
      return Settings.read(key, DataType_Boolean);
};

// Mark tutorial as completed
TutorialManagerDialog.prototype.markTutorialCompleted = function(tutorialId) {
      if (this.useAdvancedOptions === false) {
            return;
      }
      var key = "AutoIntegrate_Tutorial_" + tutorialId + "_Completed";
      Settings.write(key, DataType_Boolean, true);
};

// Mark selected tutorial as completed
TutorialManagerDialog.prototype.markSelectedAsCompleted = function() {
      var node = this.tutorialList.currentNode;
      if (!node) {
            return;
      }
      
      this.markTutorialCompleted(node.tutorialId);
      this.populateTutorials();
      
      Console.noteln("Tutorial marked as completed: " + node.tutorialData.name);
};

// Reset all tutorials
TutorialManagerDialog.prototype.resetAllTutorials = function() {
      var tutorials = this.getTutorials();
      for (var i = 0; i < tutorials.length; i++) {
            var key = "AutoIntegrate_Tutorial_" + tutorials[i].id + "_Completed";
            Settings.remove(key);
      }
      this.populateTutorials();
};

// Launch selected tutorial
TutorialManagerDialog.prototype.launchSelectedTutorial = function() {
      var node = this.tutorialList.currentNode;
      if (!node) {
            var msg = new MessageBox(
                  "Please select a tutorial from the list.",
                  "No Tutorial Selected",
                  StdIcon_Information,
                  StdButton_Ok
            );
            msg.execute();
            return;
      }
      
      var tutorialId = node.tutorialId;
      
      // Close this dialog
      this.ok();
      
      // Launch the specific tutorial
      if (this.parentDialog && this.parentDialog.startTutorialById) {
            this.parentDialog.startTutorialById(tutorialId);
      }
};

// ============================================================================
// Tutorial System for AutoIntegrate
// ============================================================================

function TutorialSystem(dialog) {
      this.dialog = dialog;
      this.global = dialog.global;
      this.currentStep = 0;
      this.isActive = false;
      this.steps = [];

      // Overlay to dim the background
      this.overlay = new Control(dialog);
      this.overlay.visible = false;
      this.overlay.cursor = new Cursor(StdCursor_Arrow);
      this.overlay.styleSheet = "QWidget { background-color: rgba(0, 0, 0, 128); }";

      // Tutorial tooltip
      this.tooltip = new Control(dialog);
      this.tooltip.visible = false;
      this.tooltip.setFixedSize(300, 300);

      // Tooltip content
      this.tooltipText = new Label(this.tooltip);
      this.tooltipText.wordWrapping = true;
      this.tooltipText.styleSheet = "QLabel { color: #FFFFFF; padding: 10px; }";

      this.tooltipTitle = new Label(this.tooltip);
      this.tooltipTitle.styleSheet = "QLabel { color: #FFFFFF; font-weight: bold; font-size: 12px; padding: 10px; background: #0066CC; }";

      // Navigation buttons

      // Next button - Blue with white text
      this.nextButton = new PushButton(this.tooltip);
      this.nextButton.text = "Next";
      this.nextButton.defaultButton = true;
      this.nextButton.styleSheet = "QPushButton { color: #FFFFFF; }";
      var self = this;
      this.nextButton.onClick = function() {
            self.nextStep();
      };

      // Previous button - Gray with white text
      this.prevButton = new PushButton(this.tooltip);
      this.prevButton.text = "Previous";
      this.prevButton.styleSheet = "QPushButton { color: #FFFFFF; }";
      this.prevButton.onClick = function() {
            self.previousStep();
      };

      // Skip button - Red/Orange with white text
      this.skipButton = new PushButton(this.tooltip);
      this.skipButton.text = "Skip Tutorial";
      this.skipButton.styleSheet = "QPushButton { color: #FFFFFF; }";
      
      this.skipButton.onClick = function() {
            self.endTutorial();
      };

      // Counter label
      this.counterLabel = new Label(this.tooltip);
      this.counterLabel.styleSheet = "QLabel { color: #FFFFFF; }";

      // Layout tooltip
      var buttonSizer = new HorizontalSizer;
      buttonSizer.spacing = 4;
      buttonSizer.add(this.prevButton);
      buttonSizer.addStretch();
      buttonSizer.add(this.counterLabel);
      buttonSizer.addStretch();
      buttonSizer.add(this.nextButton);

      var tooltipSizer = new VerticalSizer;
      tooltipSizer.margin = 0;
      tooltipSizer.spacing = 8;
      tooltipSizer.add(this.tooltipTitle);
      tooltipSizer.add(this.tooltipText);
      tooltipSizer.addStretch();
      tooltipSizer.add(buttonSizer);
      tooltipSizer.add(this.skipButton);

      this.tooltip.sizer = tooltipSizer;
      this.tooltip.styleSheet = "QWidget { background: #2C3E50; border: 2px solid #3498DB; border-radius: 5px; }";

      // Highlight frame
      this.highlightFrame = new Control(dialog);
      this.highlightFrame.visible = false;
      this.highlightFrame.styleSheet = "QWidget { border: 3px solid #FFD700; background: transparent; border-radius: 3px; }";

      // Blink timer for highlighted elements
      this.blinkTimer = new Timer();
      this.blinkTimer.interval = 0.5;
      this.blinkCount = 0;
      this.blinkTimer.onTimeout = function() {
            if (self.blinkCount % 2 === 0) {
                  self.highlightFrame.styleSheet = "QWidget { border: 3px solid #FFD700; background: rgba(255, 215, 0, 50); border-radius: 3px; }";
            } else {
                  self.highlightFrame.styleSheet = "QWidget { border: 3px solid #FFD700; background: transparent; border-radius: 3px; }";
            }
            self.blinkCount++;

            if (self.blinkCount >= 6) {
                  self.blinkTimer.stop();
                  self.highlightFrame.styleSheet = "QWidget { border: 3px solid #FFD700; background: rgba(255, 215, 0, 30); border-radius: 3px; }";
            }
      };
}

// Define tutorial steps
TutorialSystem.prototype.defineSteps = function(steps) {
      this.steps = steps;
};

// Start tutorial
TutorialSystem.prototype.start = function() {
      this.isActive = true;
      this.currentStep = 0;
      // this.hideSections(); Maybe better to leave as is
      this.showSelectedSections();
      this.showStep(0);
};

TutorialSystem.prototype.hideSections = function() {
      for (var i = 0; i < this.global.sectionBars.length; i++) {
            this.global.sectionBars[i].aiControl.hide();
      }
};

TutorialSystem.prototype.showSelectedSections = function() {
      for (var step = 0; step < this.steps.length; step++) {
            if (this.steps[step].sectionBars === undefined || this.steps[step].sectionBars === null) {
                  continue;
            }
            var sectionBarsToShow = this.steps[step].sectionBars;
            for (var i = 0; i < this.global.sectionBars.length; i++) {
                  for (var j = 0; j < sectionBarsToShow.length; j++) {
                        if (sectionBarsToShow[j] === this.global.sectionBars[i].aiName) {
                              this.global.sectionBars[i].aiControl.show();
                              processEvents();  // Force UI update
                        }
                  }
            }
      }
      this.dialog.adjustToContents();
      processEvents();  // Force UI update
};

// Show specific step
TutorialSystem.prototype.showStep = function(stepIndex) {
      if (stepIndex < 0 || stepIndex >= this.steps.length) {
            this.endTutorial();
            return;
      }

      this.currentStep = stepIndex;
      var step = this.steps[stepIndex];

      // AUTO-SWITCH TO TAB if specified
      if (step.switchToTab !== undefined && step.switchToTab !== null) {
            // console.writeln("Tutorial: Switching to tab index " + step.switchToTab);
            this.dialog.mainTabBox.currentPageIndex = step.switchToTab;
            processEvents();  // Force UI update
      }
      // Update tooltip content
      this.tooltipTitle.text = step.title;
      this.tooltipText.text = step.description;
      this.counterLabel.text = "Step " + (stepIndex + 1) + " of " + this.steps.length;

      // Update button states
      this.prevButton.enabled = stepIndex > 0;
      this.nextButton.text = (stepIndex === this.steps.length - 1) ? "Finish" : "Next";

      // Show overlay
      this.overlay.visible = true;
      this.overlay.setFixedSize(this.dialog.width, this.dialog.height);
      this.overlay.move(0, 0);
      this.overlay.bringToFront();

      // Highlight target element
      if (step.named_target) {
            if (step.named_target == "coordinatesCopyFirstButton") {
                  if (this.global.use_preview && this.global.ppar.preview.side_preview_visible && this.dialog.sidePreviewObj) {
                        step.target = this.dialog.sidePreviewObj.control.coordinatesCopyFirstButton;
                  }
            }
      }
      if (step.target) {
            this.highlightElement(step.target);
      } else {
            this.highlightFrame.visible = false;
      }

      // Position tooltip
      this.positionTooltip(step.target, step.tooltipPosition);

      // Show tooltip
      this.tooltip.visible = true;
      this.tooltip.bringToFront();

      // Start blink animation
      this.blinkCount = 0;
      this.blinkTimer.start();

      // Bring target to front if needed
      if (step.target) {
            step.target.bringToFront();
      }

      processEvents();
};

// Highlight an element
TutorialSystem.prototype.highlightElement = function(element) {
      if (!element) {
            this.highlightFrame.visible = false;
            return;
      }
      
      // Get element's global screen position
      var globalPos = element.localToGlobal(new Point(0, 0));
      
      // Get dialog's global screen position
      var dialogGlobal = this.dialog.localToGlobal(new Point(0, 0));

      // Calculate relative position
      var x = globalPos.x - dialogGlobal.x;
      var y = globalPos.y - dialogGlobal.y;
      
      // Set highlight frame size and position
      this.highlightFrame.setFixedSize(element.width + 6, element.height + 6);
      this.highlightFrame.move(x - 3, y - 3);
      this.highlightFrame.visible = true;
      this.highlightFrame.bringToFront();
};

// Position tooltip relative to target
TutorialSystem.prototype.positionTooltip2 = function(target, position) {
      position = position || "left";

      var tooltipWidth = 300;
      var tooltipHeight = 300;
      var margin = 20;

      var x, y;

      target = this.dialog.mainTabBox;
      position = "left";

      if (target) {
            var pos = target.localToGlobal(target.position);
            var dialogPos = this.dialog.localToGlobal(this.dialog.position);
            var targetX = pos.x - dialogPos.x;
            var targetY = pos.y - dialogPos.y;

            switch (position) {
                  case "right":
                        x = targetX + target.width + margin;
                        y = targetY;
                        break;
                  case "left":
                        x = targetX - tooltipWidth - margin;
                        y = targetY;
                        break;
                  case "top":
                        x = targetX;
                        y = targetY - tooltipHeight - margin;
                        break;
                  case "bottom":
                        x = targetX;
                        y = targetY + target.height + margin;
                        break;
                  case "center":
                  default:
                        x = (this.dialog.width - tooltipWidth) / 2;
                        y = (this.dialog.height - tooltipHeight) / 2;
                        break;
            }
      } else {
            // Center if no target
            x = (this.dialog.width - tooltipWidth) / 2;
            y = (this.dialog.height - tooltipHeight) / 2;
      }

      // Keep within dialog bounds
      x = Math.max(10, Math.min(x, this.dialog.width - tooltipWidth - 10));
      y = Math.max(10, Math.min(y, this.dialog.height - tooltipHeight - 10));

      this.tooltip.move(x, y);
};

TutorialSystem.prototype.positionTooltip = function(target, position) {
      position = position || "right";
      
      var tooltipWidth = 320;
      var tooltipHeight = 180;
      var margin = 20;
      
      var x, y;

      target = this.dialog.mainTabBox;
      position = "left";
    
    if (target) {
        // Use the same method as highlightElement
        var targetGlobal = target.localToGlobal(new Point(0, 0));
        var dialogGlobal = this.dialog.localToGlobal(new Point(0, 0));
        var targetX = targetGlobal.x - dialogGlobal.x;
        var targetY = targetGlobal.y - dialogGlobal.y;
        
        switch (position) {
            case "right":
                x = targetX + target.width + margin;
                y = targetY;
                break;
            case "left":
                x = targetX - tooltipWidth - margin;
                y = targetY;
                break;
            case "top":
                x = targetX;
                y = targetY - tooltipHeight - margin;
                break;
            case "bottom":
                x = targetX;
                y = targetY + target.height + margin;
                break;
            case "top-right":
                x = targetX + target.width + margin;
                y = targetY - tooltipHeight - margin;
                break;
            case "bottom-right":
                x = targetX + target.width + margin;
                y = targetY + target.height + margin;
                break;
            case "top-left":
                x = targetX - tooltipWidth - margin;
                y = targetY - tooltipHeight - margin;
                break;
            case "bottom-left":
                x = targetX - tooltipWidth - margin;
                y = targetY + target.height + margin;
                break;
            case "center":
            default:
                x = (this.dialog.width - tooltipWidth) / 2;
                y = (this.dialog.height - tooltipHeight) / 2;
                break;
        }
        
        // Center vertically relative to target for left/right positions
        if (position === "right" || position === "left") {
            y = targetY + (target.height / 2) - (tooltipHeight / 2);
        }
        
        // Center horizontally relative to target for top/bottom positions
        if (position === "top" || position === "bottom") {
            x = targetX + (target.width / 2) - (tooltipWidth / 2);
        }
    } else {
        // Center if no target
        x = (this.dialog.width - tooltipWidth) / 2;
        y = (this.dialog.height - tooltipHeight) / 2;
    }
    
    // Keep within dialog bounds
    x = Math.max(10, Math.min(x, this.dialog.width - tooltipWidth - 10));
    y = Math.max(10, Math.min(y, this.dialog.height - tooltipHeight - 10));
    
    this.tooltip.move(x, y);
};

// Navigate to next step
TutorialSystem.prototype.nextStep = function() {
      this.blinkTimer.stop();
      if (this.currentStep < this.steps.length - 1) {
            this.showStep(this.currentStep + 1);
      } else {
            this.endTutorial();
      }
};

// Navigate to previous step
TutorialSystem.prototype.previousStep = function() {
      this.blinkTimer.stop();
      if (this.currentStep > 0) {
            this.showStep(this.currentStep - 1);
      }
};

// End tutorial
TutorialSystem.prototype.endTutorial = function() {
    this.isActive = false;
    this.blinkTimer.stop();
    this.overlay.visible = false;
    this.tooltip.visible = false;
    this.highlightFrame.visible = false;
    
    // Mark tutorial as completed
    if (this.currentTutorialId &&  !this.dialog.global.do_not_write_settings) {
        var key = "AutoIntegrate_Tutorial_" + this.currentTutorialId + "_Completed";
        Settings.write(key, DataType_Boolean, true);
        Console.noteln("Tutorial completed: " + this.currentTutorialId);
    }
    
    processEvents();
};

// Check if tutorial should be shown
TutorialSystem.prototype.shouldShowTutorial = function() {
      if (this.dialog.global.do_not_read_settings) {
            return true;
      } else {
            var shown = Settings.read("AutoIntegrate_TutorialShown", DataType_Boolean);
            return !shown;
      }
};

