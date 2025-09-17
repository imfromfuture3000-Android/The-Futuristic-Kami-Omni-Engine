import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const Heatmap = ({ traitFusionStats }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!traitFusionStats || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const width = 400;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };

    svg.attr('width', width).attr('height', height);

    const xScale = d3.scaleBand()
      .domain(traitFusionStats.map(d => d.traitA))
      .range([margin.left, width - margin.right])
      .padding(0.1);

    const yScale = d3.scaleBand()
      .domain(traitFusionStats.map(d => d.traitB))
      .range([margin.top, height - margin.bottom])
      .padding(0.1);

    const fusionColorScale = d3.scaleSequential(d3.interpolateBlues)
      .domain([0, 1]); // Assuming successRate is 0-1

    svg.selectAll('rect')
      .data(traitFusionStats)
      .enter()
      .append('rect')
      .attr('x', d => xScale(d.traitA))
      .attr('y', d => yScale(d.traitB))
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', d => fusionColorScale(d.successRate))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1);

    // Add axes if needed
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(xAxis);

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(yAxis);

  }, [traitFusionStats]);

  return (
    <div>
      <svg ref={svgRef} id="heatmap"></svg>
    </div>
  );
};

export default Heatmap;