/*
 * Copyright (c) 2018, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { VictoryScatter, VictoryTooltip } from 'victory';
import _ from 'lodash';
import { scaleLinear } from 'd3';
import BaseChart from './BaseChart';
import VizGError from '../VizGError';
import ChartContainer from './ChartContainer';
import LegendComponent from './LegendComponent';
import lightTheme from './resources/themes/victoryLightTheme';
import darkTheme from './resources/themes/victoryDarkTheme';

/**
 * Class to handle visualization of scatter plots.
 */
export default class ScatterPlot extends BaseChart {
    constructor(props) {
        super(props);
        this.state = {
            dataSets: {},
            chartArray: [],
            xScale: 'linear',
        };

        this.sortDataBasedOnConfig = this.sortDataBasedOnConfig.bind(this);
        this.handleMouseClickEvent = this.handleMouseClickEvent.bind(this);
    }

    sortDataBasedOnConfig(props) {
        const { config, data, metadata } = props;
        let { dataSets, chartArray, xScale } = this.state;

        if (chartArray.length === 0) chartArray = BaseChart.generateChartArray(config.charts);

        chartArray.forEach((chart, i) => {
            const xIndex = _.indexOf(metadata.names, chart.x);
            const yIndex = _.indexOf(metadata.names, chart.y);
            const sizeIndex = _.indexOf(metadata.names, chart.size);
            const colorIndex = _.indexOf(metadata.names, chart.colorCategoryName);

            xScale = BaseChart.getXScale(metadata.types[xIndex]);
            if (xIndex === -1) throw new VizGError('ScatterPlot', `x axis name '${chart.x}' is not found among metadata.`);
            if (yIndex === -1) throw new VizGError('ScatterPlot', `y axis name '${chart.y}' is not found among metadata.`);
            if (chart.colorCategoryName && colorIndex === -1) throw new VizGError('ScatterPlot', `color dimension name '${chart.colorCategoryName}' is not found among metadata.`);
            if (chart.size && sizeIndex === -1) throw new VizGError('ScatterPlot', `Size dimension name '${chart.size}' not found among metadata`);

            if (chart.colorCategoryName && metadata.types[colorIndex] === 'ordinal') {
                const dataSet = _.groupBy(data.map(
                    datum => ({ x: datum[xIndex], y: datum[yIndex], color: datum[colorIndex], amount: datum[sizeIndex] })), d => d.color);

                _.difference(_.keys(dataSet), _.keys(chart.dataSetNames)).forEach((key) => {
                    const colorDomIn = _.indexOf(chart.colorDomain, key);
                    if (chart.colorIndex >= chart.colorScale.length) {
                        chart.colorIndex = 0;
                    }
                    if (colorDomIn < 0) {
                        chart.dataSetNames[key] = chart.colorScale[chart.colorIndex++];
                    } else if (colorDomIn > chart.colorScale.length) {
                        chart.dataSetNames[key] = chart.colorScale[0];
                    } else {
                        chart.dataSetNames[key] = chart.colorScale[colorDomIn];
                    }
                });

                _.mergeWith(dataSets, dataSet, (objValue, srcValue) => {
                    if (_.isArray(objValue)) {
                        return objValue.concat(srcValue);
                    }
                });
            } else {
                chart.dataSetNames[chart.y] = chart.colorScale[0];
                dataSets[chart.y] = dataSets[chart.y] || [];
                dataSets[chart.y]
                    .push(...(data.map(datum => ({
                        x: datum[xIndex],
                        y: datum[yIndex],
                        color: datum[colorIndex],
                        amount: datum[sizeIndex],
                        chartIndex: i,
                    }))));
            }
            if (config.charts[chart.id].maxLength) {
                const maxLength = config.charts[chart.id].maxLength;
                _.keys(chart.dataSetNames).forEach((key) => {
                    const lengthDiff = dataSets[key].length - maxLength;
                    dataSets[key].splice(0, lengthDiff);
                });
            }
        });

        this.setState({ chartArray, dataSets, xScale });
    }

    handleMouseClickEvent(props) {
        const { onClick } = this.props;

        const chartInfo = this.state.chartArray[props.datum.chartIndex];

        const data = {};

        data[chartInfo.x] = props.datum.x;
        data[chartInfo.y] = props.datum.y;
        data.colorCategory = props.datum.color;
        data.size = props.datum.amount;

        return onClick && onClick(data);
    }

    render() {
        const { config, metadata, theme, width, height } = this.props;
        const { chartArray, dataSets, xScale } = this.state;
        const chartComponents = [];
        const legendComponents = [];
        const currentTheme = theme === 'light' ? lightTheme : darkTheme;

        chartArray.map((chart) => {
            const colorIndex = _.indexOf(metadata.names, chart.colorCategoryName);

            _.keys(chart.dataSetNames).forEach((key) => {
                legendComponents.push({ name: key, symbol: { fill: chart.dataSetNames[key] } });
                chartComponents.push((
                    <VictoryScatter
                        key={'scatter-plot-' + chart.id}
                        data={dataSets[key]}
                        bubbleProperty='amount'
                        maxBubbleSize={15}
                        minBubbleSize={5}
                        style={{
                            data: {
                                fill: (() => {
                                    if (colorIndex > -1 && metadata.types[colorIndex] === 'linear') {
                                        return (d) => {
                                            return scaleLinear()
                                                .range([chart.colorScale[0], chart.colorScale[1]])
                                                .domain([
                                                    _.min(dataSets[key].map(obj => obj.color)),
                                                    _.max(dataSets[key].map(obj => obj.color))])(d.color);
                                        };
                                    } else if (colorIndex > -1) {
                                        return chart.dataSetNames[key];
                                    } else {
                                        return null;
                                    }
                                })(),
                            },
                        }}
                        labels={
                            (d) => {
                                let text = `${config.charts[chart.id].x} : ${d.x}\n` +
                                    `${config.charts[chart.id].y} : ${d.y}\n`;
                                if (config.charts[chart.id].size) {
                                    text += `${config.charts[chart.id].size} : ${d.amount}\n`;
                                }

                                if (config.charts[chart.id].color) {
                                    text += `${config.charts[chart.id].color} : ${d.color}`;
                                }

                                return text;
                            }
                        }
                        labelComponent={
                            <VictoryTooltip
                                orientation='top'
                                pointerLength={4}
                                cornerRadius={2}
                                flyoutStyle={{
                                    fill: currentTheme.tooltip.style.flyout.fill,
                                    fillOpacity: currentTheme.tooltip.style.flyout.fillOpacity,
                                    strokeWidth: currentTheme.tooltip.style.flyout.strokeWidth
                                }}
                                style={{ fill: currentTheme.tooltip.style.labels.fill }}
                            />
                        }
                        events={[{
                            target: 'data',
                            eventHandlers: {
                                onClick: () => {
                                    return [{ target: 'data', mutation: this.handleMouseClickEvent }];
                                },
                            },
                        }]}
                        animate={config.animate ? { onEnter: { duration: 100 } } : null}
                    />
                ));
            });
        });

        return (
            <ChartContainer
                width={this.props.width || width || 800}
                height={this.props.height || height || 800}
                config={config}
                xScale={xScale}
                yDomain={this.props.yDomain}
                xDomain={this.state.xDomain}
                xRange={this.xRange}
                dataSets={dataSets}
                theme={theme}
            >
                {chartComponents}
                {
                    config.legend ?
                        <LegendComponent
                            height={height}
                            width={width}
                            legendItems={legendComponents}
                            interaction={() => { }}
                            config={config}
                        /> : null
                }
            </ChartContainer>
        );
    }
}
