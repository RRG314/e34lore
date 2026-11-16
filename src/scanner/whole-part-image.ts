import {RawImage} from '@huggingface/transformers';
import {partFrame,padPartPixels} from './part-framing';
export async function wholePartImage(image:RawImage){
 const frame=partFrame(image.width,image.height);
 const resized=await image.resize(frame.width,frame.height,{resample:3});
 return new RawImage(padPartPixels(resized.data,resized.width,resized.height,resized.channels,frame.size,frame.left,frame.top),frame.size,frame.size,3);
}
