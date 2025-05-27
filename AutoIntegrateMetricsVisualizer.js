// AutoIntegrate Astro Image Metrics Visualizer Dialog
// For SubFrame Selector metrics visualization

#include <pjsr/Sizer.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/StdButton.jsh>
#include <pjsr/StdIcon.jsh>
#include <pjsr/Color.jsh>

#define WINDOW_TITLE "AutoIntegrate Metrics Visualizer"

function AutoIntegrateMetricsVisualizer(global)
{

this.__base__ = Object;
this.__base__();

var dialog;

// Sample data structure - replace with your actual metrics arrays
var metricsData = [
    { name: "fwhm", data: [2.1, 2.3, 1.8, 2.5, 2.0, 2.2, 1.9, 2.4, 2.1, 1.7], limit: 0.0, filter_high: true },
    { name: "eccentricity", data: [0.15, 0.22, 0.18, 0.28, 0.12, 0.19, 0.16, 0.25, 0.14, 0.11], limit: 0.0, filter_high: true },
    { name: "snr", data: [45.2, 38.7, 52.1, 33.8, 48.9, 41.3, 46.7, 35.2, 49.8, 54.3], limit: 0.0, filter_high: true },
    { name: "stars", data: [0.85, 0.72, 0.91, 0.65, 0.88, 0.78, 0.83, 0.69, 0.87, 0.93], limit: 0.0, filter_high: false }
];

var metricsFilteredOut = [];

// Custom plotting control
function PlotControl(parent, metrics, color) {
    this.__base__ = Control;
    this.__base__(parent);

    this.metrics = metrics;
    this.title = metrics.name;
    this.data = metrics.data;
    this.filter_high = metrics.filter_high;
    this.plotColor = color || 0xFF0066CC; // Default blue
    this.margin = 40;
    this.preferredWidth = 500;
    this.preferredHeight = 250;
    this.plot_limit = metrics.limit || 0.0;

    if (this.title == 'None') {
        this.enabled = false;
    }

    this.setFixedSize(this.preferredWidth, this.preferredHeight);
    
    // Calculate data statistics
    this.minValue = Math.min.apply(Math, this.data);
    this.maxValue = Math.max.apply(Math, this.data);
    this.range = this.maxValue - this.minValue;
    
    this.onPaint = function(x0, y0, x1, y1) {
        // console.writeln("PlotControl onPaint: " + this.title + " plot_limit " + this.plot_limit);
        var graphics = new Graphics(this);
        graphics.fillRect(this.boundsRect, new Brush(0xFF2D2D30)); // Dark background
        
        // Calculate plot area
        var plotX = this.margin;
        var plotY = this.margin;
        var plotWidth = this.width - 2 * this.margin;
        var plotHeight = this.height - 2 * this.margin;
        
        // Draw plot background
        graphics.fillRect(new Rect(plotX, plotY, plotX + plotWidth, plotY + plotHeight), 
                         new Brush(0xFF1E1E1E));
        
        // Draw border
        graphics.pen = new Pen(0xFF404040, 1);
        graphics.drawRect(plotX, plotY, plotX + plotWidth, plotY + plotHeight);
        
        // Draw title
        graphics.pen = new Pen(0xFFFFFFFF);
        graphics.font = new Font("Arial", 12);
        var titleWidth = graphics.font.width(this.title);
        graphics.drawText((this.width - titleWidth) / 2, 20, this.title);
        
        // Draw grid lines
        graphics.pen = new Pen(0xFF404040, 1);
        for (var i = 1; i < 5; i++) {
            var y = plotY + (plotHeight * i / 5);
            graphics.drawLine(plotX, y, plotX + plotWidth, y);
        }
        
        // Draw data points and lines
        if (this.data.length > 0) {
            graphics.pen = new Pen(this.plotColor, 2);
            graphics.antialiasing = true;
            
            var points = [];
            var accept_count = 0;
            for (var i = 0; i < this.data.length; i++) {
                var x = plotX + (plotWidth * i / (this.data.length - 1));
                var normalizedValue = (this.data[i] - this.minValue) / this.range;
                var y = plotY + plotHeight - (plotHeight * normalizedValue);
                // Count filtering for this metric
                if (this.plot_limit == 0.0) {
                    accept_count++;
                } else if (this.filter_high) {
                    if (this.data[i] <= this.plot_limit) {
                        accept_count++;
                    }
                } else {
                    if (this.data[i] >= this.plot_limit) {
                        accept_count++;
                    }
                }
                points.push(new Point(x, y));
            }
            
            if (0) {
                // Draw connecting lines
                for (var i = 0; i < points.length - 1; i++) {
                    graphics.drawLine(points[i], points[i + 1]);
                }
            }            
            // Draw data points
            graphics.brush = new Brush(this.plotColor);
            for (var i = 0; i < points.length; i++) {
                if (metricsFilteredOut[i]) {
                    // Gray out points filtered out
                    graphics.brush = new Brush(0xffC0C0C0);
                } else {
                    graphics.brush = new Brush(this.plotColor);
                }
                graphics.fillCircle(points[i], 2);
            }
            
            // Draw value labels
            graphics.pen = new Pen(0xFFCCCCCC);
            graphics.font = new Font("Arial", 8);
            
            // Y-axis labels
            for (var i = 0; i <= 5; i++) {
                if (i == 0) {
                    var value = this.minValue;
                } else if (i == 5) {
                    var value = this.maxValue;
                } else {
                    // Calculate intermediate values
                    var value = this.minValue + (this.range * i / 5);
                }
                // Calculate Y position for label
                var y = plotY + plotHeight - (plotHeight * i / 5);
                // Adaptive change the number of decimals based on range
                if (this.range < 10.0) {
                    var label = value.toFixed(4);
                } else if (this.range < 100.0) {
                    var label = value.toFixed(3);
                } else if (this.range < 1000.0) {
                    var label = value.toFixed(2);
                } else {
                    var label = value.toFixed(1);
                }
                // graphics.drawText(5, y - 4, label);
                graphics.drawText(5, y, label);
            }
            
            if (0) {
                // X-axis labels (frame numbers)
                for (var i = 0; i < Math.min(this.data.length, 10); i += Math.max(1, Math.floor(this.data.length / 10))) {
                    var x = plotX + (plotWidth * i / (this.data.length - 1));
                    graphics.drawText(x - 5, plotY + plotHeight + 15, (i + 1).toString());
                }
            }
            this.dataLabel.text =  accept_count + " / " + this.data.length;
        } else {
            this.dataLabel.text = "";
        }
        
        graphics.end();
    };
}

PlotControl.prototype = new Control;

// Statistics panel
function StatsControl(parent, title, data) {
    this.__base__ = Control;
    this.__base__(parent);
    
    this.title = title;
    this.data = data;
    this.preferredHeight = 120;

    if (title == 'None') {
        this.enabled = false;
    }
    
    // Calculate statistics
    var sum = this.data.reduce(function(a, b) { return a + b; }, 0);
    this.mean = sum / this.data.length;
    this.min = Math.min.apply(Math, this.data);
    this.max = Math.max.apply(Math, this.data);
    
    var variance = this.data.reduce(function(acc, val) {
        return acc + Math.pow(val - this.mean, 2);
    }.bind(this), 0) / this.data.length;
    this.stdDev = Math.sqrt(variance);
    
    this.onPaint = function() {
        var graphics = new Graphics(this);
        graphics.fillRect(this.boundsRect, new Brush(0xFF2D2D30));

        if (!this.enabled) {
            graphics.end();
            return;
        }

        graphics.pen = new Pen(0xFFFFFFFF);
        graphics.font = new Font("Arial", 8);
        
        var y = 15;
        var lineHeight = 16;
        
        graphics.drawText(10, y, this.title + " Statistics:");
        y += lineHeight + 5;
        
        graphics.drawText(10, y, "Mean: " + this.mean.toFixed(5));
        y += lineHeight;
        graphics.drawText(10, y, "Min: " + this.min.toFixed(5));
        y += lineHeight;
        graphics.drawText(10, y, "Max: " + this.max.toFixed(5));
        y += lineHeight;
        graphics.drawText(10, y, "Std Dev: " + this.stdDev.toFixed(5));
        
        graphics.end();
    };
}

StatsControl.prototype = new Control;

function newLimitEdit(parent, title, plot) {
    var limitEdit = new NumericEdit(parent);
    
    if (title == 'None') {
        limitEdit.enabled = false;
    }
    
    limitEdit.real = true;
    limitEdit.textAlignment = TextAlign_Left|TextAlign_VertCenter;
    limitEdit.label.text = title + " Limit" + (plot.filter_high ? " (Max)" : " (Min)");
    limitEdit.label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
    limitEdit.minWidth = 50;
    limitEdit.setPrecision( 5 );
    limitEdit.setRange(0, 1000000);
    limitEdit.setValue(plot.plot_limit || 0.0);
    limitEdit.plot = plot;

    if (limitEdit.plot.filter_high) {
        limitEdit.toolTip = "Set the maximum value for " + title + " metric. Values above this limit will be filtered out.";
    } else {
        limitEdit.toolTip = "Set the minimum value for " + title + " metric. Values below this limit will be filtered out.";
    }

    limitEdit.onValueUpdated = function(value) {
        // console.writeln("Limit Updated: " + value + " for " + this.label.text);
        this.plot.plot_limit = value;
        this.plot.metrics.limit = value;
        // Update plot with new limit
        dialog.updateData();
    };
    return limitEdit;
}

function newLabel(parent)
{
        var lbl = new Label( parent );
        lbl.text = "";
        lbl.textAlignment = TextAlign_Right|TextAlign_VertCenter;
        return lbl;
}

// Main dialog
function AstroMetricsDialog() {
    this.__base__ = Dialog;
    this.__base__();
    
    this.windowTitle = WINDOW_TITLE;
    this.minWidth = 800;
    this.minHeight = 780;
    
    // Create plot controls for each metric
    this.data1Plot = new PlotControl(this, metricsData[0], 0xFF00AA00);
    this.data2Plot = new PlotControl(this, metricsData[1], 0xFFFF6600);
    this.data3Plot = new PlotControl(this, metricsData[2], 0xFF0066FF);
    this.data4Plot = new PlotControl(this, metricsData[3], 0xFFCC0066);
    
    // Create statistics panels
    this.data1Stats = new StatsControl(this, metricsData[0].name, metricsData[0].data);
    this.data2Stats = new StatsControl(this, metricsData[1].name, metricsData[1].data);
    this.data3Stats = new StatsControl(this, metricsData[2].name, metricsData[2].data);
    this.data4Stats = new StatsControl(this, metricsData[3].name, metricsData[3].data);

    // Edit fields for limits
    this.data1LimitEdit = newLimitEdit(this, metricsData[0].name, this.data1Plot);
    this.data2LimitEdit = newLimitEdit(this, metricsData[1].name, this.data2Plot);
    this.data3LimitEdit = newLimitEdit(this, metricsData[2].name, this.data3Plot);
    this.data4LimitEdit = newLimitEdit(this, metricsData[3].name, this.data4Plot);

    this.data1Label = newLabel(this);
    this.data1Plot.dataLabel = this.data1Label;
    this.data2Label = newLabel(this);
    this.data2Plot.dataLabel = this.data2Label;
    this.data3Label = newLabel(this);
    this.data3Plot.dataLabel = this.data3Label;
    this.data4Label = newLabel(this);
    this.data4Plot.dataLabel = this.data4Label;

    // Sizer for the edit fields
    this.data1LimitEditSizer = new HorizontalSizer;
    this.data1LimitEditSizer.addSpacing(4);
    this.data1LimitEditSizer.add(this.data1LimitEdit);
    this.data1LimitEditSizer.addSpacing(20);
    this.data1LimitEditSizer.add(this.data1Label);
    this.data1LimitEditSizer.addStretch();

    this.data2LimitEditSizer = new HorizontalSizer;
    this.data2LimitEditSizer.addSpacing(4);
    this.data2LimitEditSizer.add(this.data2LimitEdit);
    this.data2LimitEditSizer.addSpacing(20);
    this.data2LimitEditSizer.add(this.data2Label);
    this.data2LimitEditSizer.addStretch();

    this.data3LimitEditSizer = new HorizontalSizer;
    this.data3LimitEditSizer.addSpacing(4);
    this.data3LimitEditSizer.add(this.data3LimitEdit);
    this.data3LimitEditSizer.addSpacing(20);
    this.data3LimitEditSizer.add(this.data3Label);
    this.data3LimitEditSizer.addStretch();

    this.data4LimitEditSizer = new HorizontalSizer;
    this.data4LimitEditSizer.addSpacing(4);
    this.data4LimitEditSizer.add(this.data4LimitEdit);
    this.data4LimitEditSizer.addSpacing(20);
    this.data4LimitEditSizer.add(this.data4Label);
    this.data4LimitEditSizer.addStretch();

    this.totalLabel = newLabel(this);

    // Sizer for the total accepted frames
    this.totalLabelSizer = new HorizontalSizer;
    this.totalLabelSizer.addSpacing(24);
    this.totalLabelSizer.add(this.totalLabel);
    this.totalLabelSizer.addStretch();

    // Layout
    this.plotsGroupBox = new GroupBox(this);
    this.plotsGroupBox.title = "Metrics Visualization";
    this.plotsGroupBox.sizer = new VerticalSizer;

    // Plot 1 with data plot and edit field for limit
    this.data1Plotsizer = new VerticalSizer;
    this.data1Plotsizer.add(this.data1Plot);
    this.data1Plotsizer.addSpacing(4);
    this.data1Plotsizer.add(this.data1LimitEditSizer);

    // Plot2 with data plot and edit field for limit
    this.data2Plotsizer = new VerticalSizer;
    this.data2Plotsizer.add(this.data2Plot);
    this.data2Plotsizer.addSpacing(4);
    this.data2Plotsizer.add(this.data2LimitEditSizer);

    // Plot3 with data plot and edit field for limit
    this.data3Plotsizer = new VerticalSizer;
    this.data3Plotsizer.add(this.data3Plot);
    this.data3Plotsizer.addSpacing(4);
    this.data3Plotsizer.add(this.data3LimitEditSizer);

    // Plot4 with data plot and edit field for limit
    this.data4Plotsizer = new VerticalSizer;
    this.data4Plotsizer.add(this.data4Plot);
    this.data4Plotsizer.addSpacing(4);
    this.data4Plotsizer.add(this.data4LimitEditSizer);
    
    // First row of plots
    this.topRowSizer = new HorizontalSizer;
    this.topRowSizer.addSpacing(20);
    this.topRowSizer.add(this.data1Plotsizer);
    this.topRowSizer.addSpacing(10);
    this.topRowSizer.add(this.data2Plotsizer);
    
    // Second row of plots
    this.bottomRowSizer = new HorizontalSizer;
    this.bottomRowSizer.addSpacing(20);
    this.bottomRowSizer.add(this.data3Plotsizer);
    this.bottomRowSizer.addSpacing(10);
    this.bottomRowSizer.add(this.data4Plotsizer);
    
    this.plotsGroupBox.sizer.add(this.topRowSizer);
    this.plotsGroupBox.sizer.addSpacing(10);
    this.plotsGroupBox.sizer.add(this.bottomRowSizer);
    this.plotsGroupBox.sizer.addSpacing(4);
    this.plotsGroupBox.sizer.add(this.totalLabelSizer);
    this.plotsGroupBox.sizer.addSpacing(4);
    
    // Statistics section
    this.statsGroupBox = new GroupBox(this);
    this.statsGroupBox.title = "Statistics Summary";
    this.statsGroupBox.sizer = new HorizontalSizer;
    
    this.statsGroupBox.sizer.add(this.data1Stats);
    this.statsGroupBox.sizer.add(this.data2Stats);
    this.statsGroupBox.sizer.add(this.data3Stats);
    this.statsGroupBox.sizer.add(this.data4Stats);
    
    // Buttons
    this.okButton = new PushButton(this);
    this.okButton.text = "OK";
    this.okButton.icon = this.scaledResource(":/icons/ok.png");
    this.okButton.onClick = function() {
        // Confirm before exiting the dialog to avoid accidental exit with enter key
         if ((new MessageBox("Do you really want to close " + WINDOW_TITLE + " and apply limits?",
               WINDOW_TITLE, StdIcon_Warning, StdButton_Yes, StdButton_No)).execute() == StdButton_Yes) 
        {
            this.dialog.ok();
         }
    };
    
    this.cancelButton = new PushButton(this);
    this.cancelButton.text = "Cancel";
    this.cancelButton.icon = this.scaledResource(":/icons/cancel.png");
    this.cancelButton.onClick = function() {
        this.dialog.cancel();
    };
    
    this.buttonsRowSizer = new HorizontalSizer;
    this.buttonsRowSizer.addStretch();
    this.buttonsRowSizer.add(this.okButton);
    this.buttonsRowSizer.addSpacing(10);
    this.buttonsRowSizer.add(this.cancelButton);
    
    // Main sizer
    this.sizer = new VerticalSizer;
    this.sizer.margin = 10;
    this.sizer.spacing = 10;
    this.sizer.add(this.plotsGroupBox);
    this.sizer.add(this.statsGroupBox);
    this.sizer.add(this.buttonsRowSizer);
    
    this.adjustToContents();
}

AstroMetricsDialog.prototype = new Dialog;

// Function to update data and refresh dialog
AstroMetricsDialog.prototype.updateData = function() {

    // console.writeln("Updating data");

    this.updateFilteredOut();

    // Force repaint
    this.data1Plot.repaint();
    this.data2Plot.repaint();
    this.data3Plot.repaint();
    this.data4Plot.repaint();
};

AstroMetricsDialog.prototype.updateFilteredOut = function() {
    // console.writeln("Initializing filtering...");

    metricsFilteredOut = [];

    // Initialize metricsFilteredOut
    for (let i = 0; i < metricsData.length; i++) {
        for (let j = 0; j < metricsData[i].data.length; j++) {
            metricsFilteredOut[j] = false;
        }
    }

    // Check filtering conditions
    for (let i = 0; i < metricsData.length; i++) {
        let metric = metricsData[i];
        if (metric.name == 'None') {
            // console.writeln("Skipping metric: " + metric.name);
            continue; // Skip metrics with name 'None'
        }
        if (metric.limit == 0.0) {
            // console.writeln("No limit set for metric: " + metric.name);
            continue; // No filtering if limit is 0
        }
        // console.writeln("Filtering metric: " + metric.name + " with limit: " + metric.limit);
        if (metric.filter_high) {
            for (let j = 0; j < metric.data.length; j++) {
                if (metric.data[j] > metric.limit) {
                    metricsFilteredOut[j] = true;
                }
            }
        } else {
            for (let j = 0; j < metric.data.length; j++) {
                if (metric.data[j] < metric.limit) {
                    metricsFilteredOut[j] = true;
                }
            }
        }
    }
    // Count accepted frames
    let accepted = 0;
    for (let i = 0; i < metricsFilteredOut.length; i++) {
        if (!metricsFilteredOut[i]) {
            accepted++;
        }
    }
    this.totalLabel.text = "Accepted Frames: " + accepted + " / " + metricsFilteredOut.length;
};

// Main execution function
function main(data) {
    //console.writeln("Starting AutoIntegrate Metrics Visualizer...");

    metricsData = data;

    dialog = new AstroMetricsDialog();
    dialog.updateFilteredOut();
  
    return dialog.execute();
}

this.main = main;

}  /* AutoIntegrateMetricsVisualizer */

AutoIntegrateMetricsVisualizer.prototype = new Object;
