/** Fit the entire photograph into a square. Model center-cropping must not
 * silently remove a bracket's ears, a connector or a broken edge. */
export function partFrame(width:number,height:number,limit=384){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>40_000_000||!Number.isInteger(limit)||limit<32||limit>1024)throw Error('Invalid part photograph dimensions.');
 const size=Math.min(limit,Math.max(width,height)),scale=size/Math.max(width,height);
 const w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
 return{size,width:w,height:h,left:Math.floor((size-w)/2),top:Math.floor((size-h)/2)};
}
export function padPartPixels(data:Uint8Array|Uint8ClampedArray,width:number,height:number,channels:number,size:number,left:number,top:number){
 if(![1,3,4].includes(channels)||![width,height,size,left,top].every(Number.isInteger)||data.length!==width*height*channels||width<1||height<1||size>1024||size<Math.max(width,height)||left<0||top<0||left+width>size||top+height>size)throw Error('Invalid part photograph pixels.');
 // Edge medians resist a hand or dark component touching one corner. Transparent
 // samples do not become a black border around a product image.
 const edges:number[][]=[[],[],[]];
 const sample=(x:number,y:number)=>{const i=(y*width+x)*channels;if(channels===4&&data[i+3]<200)return;for(let c=0;c<3;c++)edges[c].push(data[i+(channels===1?0:c)]);};
 const step=Math.max(1,Math.floor(Math.max(width,height)/32));
 for(let x=0;x<width;x+=step){sample(x,0);sample(x,height-1)}for(let y=0;y<height;y+=step){sample(0,y);sample(width-1,y)}
 const background=edges.map(a=>a.length?a.sort((a,b)=>a-b)[Math.floor(a.length/2)]:238);
 const result=new Uint8ClampedArray(size*size*3);for(let i=0;i<result.length;i+=3)result.set(background,i);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const from=(y*width+x)*channels,to=((y+top)*size+x+left)*3,alpha=channels===4?data[from+3]/255:1;
  for(let c=0;c<3;c++)result[to+c]=Math.round(data[from+(channels===1?0:c)]*alpha+background[c]*(1-alpha));
 }
 return result;
}
