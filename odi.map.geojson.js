/**
  ODI Leeds Tiny Slippy Map
  Plugin for GeoJSON
  Version 0.1
**/
if(ODI.map){
	var ns = 'http://www.w3.org/2000/svg';
	function svgEl(t){ return document.createElementNS(ns,t); }
	function clone(a){ return JSON.parse(JSON.stringify(a)); }
	ODI.map.prototype.register('geojson',{
		'version':'0.1',
		'exec':function(_map){
			class geoJSONLayer extends _map.Layer {
				constructor(json,attr,pane){
					super(attr,pane);
					this._json = json||{};
					console.log('constructor',this);
					this._svg = svgEl('svg');
					ODI._setAttr(this._svg,{'xmlns':ns,'version':'1.1','overflow':'visible','preserveAspectRatio':'xMinYMin meet','vector-effect':'non-scaling-stroke'});
					this._el.appendChild(this._svg);
				}
				update(bounds,z){
					var offset,f,ll,z,tile,xy,nw,se,el,c,i,j,k,d,style,props;
					// Get tile x/y of centre
					offset = bounds.getCenter().toPx(z);
					nw = bounds.nw.toPx(z);
					se = bounds.se.toPx(z);
					ODI._setAttr(this._svg,{'viewBox':((nw.x-offset.x).toFixed(3)+' '+(nw.y-offset.y).toFixed(3)+' '+(se.x-nw.x).toFixed(3)+' '+(se.y-nw.y).toFixed(3))});
					for(f = 0 ; f < this._json.features.length; f++){
						props = {};
						if(typeof this._attr.style==="function") props = this._attr.style.call(this,this._json.features[f])||{};
						c = this._json.features[f].geometry.coordinates;
						if(this._json.features[f].geometry.type=="Point"){
							ll = this._map.LatLon(c[1],c[0]);
							xy = ll.toPx(z);
							if(!this._json.features[f].el){
								el = svgEl('circle');
								ODI._setAttr(el,{'r':5,fill:'black'});
								this._svg.appendChild(el);
								this._json.features[f].el = el;
							}
							props.cx = xy.x-offset.x;
							props.cy = xy.y-offset.y;
						}else if(this._json.features[f].geometry.type=="Polygon"){
							if(!this._json.features[f].el){
								el = svgEl('path');
								this._svg.appendChild(el);
								this._json.features[f].el = el;								
							}
							// Make the path
							d = '';
							for(i = 0; i < c.length; i++){
								for(j = 0; j < c[i].length; j++){
									xy = this._map.LatLon(c[i][j][1],c[i][j][0]).toPx(z);
									d += (j==0 ? 'M':'L')+' '+(xy.x-offset.x)+' '+(xy.y-offset.y);
								}
							}
							props.d = d;
						}else if(this._json.features[f].geometry.type=="LineString"){
							if(!this._json.features[f].el){
								el = svgEl('path');
								ODI._setAttr(el,{'r':5,stroke:'black','stroke-width':1,fill:'none'});
								this._svg.appendChild(el);
								this._json.features[f].el = el;								
							}
							// Make the points
							d = '';
							for(i = 0; i < c.length; i++){
								xy = this._map.LatLon(c[i][1],c[i][0]).toPx(z);
								d += (i==0 ? 'M':'L')+(xy.x-offset.x)+' '+(xy.y-offset.y);
							}
							props.d = d;
						}else if(this._json.features[f].geometry.type=="MultiLineString"){
							if(!this._json.features[f].el){
								el = svgEl('path');
								ODI._setAttr(el,{'r':5,stroke:'black','stroke-width':1,fill:'none'});
								this._svg.appendChild(el);
								this._json.features[f].el = el;								
							}
							// Make the points
							d = '';
							for(i = 0; i < c.length; i++){
								for(j = 0; j < c[i].length; j++){
									xy = this._map.LatLon(c[i][j][1],c[i][j][0]).toPx(z);
									d += (j==0 ? 'M':'L')+(xy.x-offset.x)+' '+(xy.y-offset.y);
								}
							}
							props.d = d;
						}else if(this._json.features[f].geometry.type=="MultiPolygon"){
							if(!this._json.features[f].el){
								el = svgEl('path');
								this._svg.appendChild(el);
								this._json.features[f].el = el;								
							}
							// Make the path
							d = '';
							for(i = 0; i < c.length; i++){
								for(j = 0; j < c[i].length; j++){
									if(c[i][j].length != 2){
										for(k = 0; k < c[i][j].length; k++){
											xy = this._map.LatLon(c[i][j][k][1],c[i][j][k][0]).toPx(z);
											d += (k==0 ? 'M':'L')+' '+(xy.x-offset.x)+' '+(xy.y-offset.y);
										}
									}
								}
							}
							props.d = d;
						}
						this._json.features[f].el.innerHTML = (props.title ? '<title>'+props.title+'</title>':'');
						ODI._setAttr(this._json.features[f].el,props);
					}
				}
				addTo(m){
					var w,h,svg;
					this._map = m;
					var p = this._attr.pane;
					if(!m.panes.p[p]) return m.log('ERROR','No pane %c'+p+'%c exists.','font-style:italic;','');
					m.panes.p[p].el.appendChild(this._el);
					m.panes.p[p].layers.push(this);
					this.update(this._map.getBounds(),this._map.getZoom());
					console.log('addTo',this._el);
					w = this._el.offsetWidth;
					h = this._el.offsetHeight;
					ODI._setAttr(this._svg,{'viewBox':('0 0 '+w+' '+h),'width':w,'height':h});

				}
			}
			ODI.map.geoJSON = function(geo,attr){
				if(!attr) attr = {};
				if(!attr.pane) attr.pane = 'overlay';	// default pane
				return new geoJSONLayer(geo,attr);
			};
		}
	});
}