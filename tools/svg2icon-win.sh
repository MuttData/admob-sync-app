#!/usr/bin/env bash
SVGPATH=$1
FILENAME=${SVGPATH%.*}

if [ ! -f $SVGPATH ]; then
    echo "File not '$SVGPATH' found!"
    exit 0
fi

ALL_SIZES="16 20 24 32 40 48 60 64 72 96 128 256"

for SIZE in $ALL_SIZES
do
#echo $FILENAME$SIZE;
#convert -channel rgba -background "rgba(0,0,0,0)" -scale $SIZE $SVGPATH $FILENAME$SIZE.png
rsvg-convert --no-keep-image-data -f png -w $SIZE -h $SIZE -o $FILENAME$SIZE.png $SVGPATH
done
PNGS=""
for SIZE in $ALL_SIZES
do
PNGS+=" $FILENAME$SIZE.png"
done

convert ${FILENAME}16.png ${FILENAME}20.png ${FILENAME}24.png ${FILENAME}32.png ${FILENAME}256.png $FILENAME.ico
convert ${FILENAME}32.png ${FILENAME}40.png ${FILENAME}48.png ${FILENAME}64.png ${FILENAME}256.png $FILENAME@2x.ico
convert ${FILENAME}48.png ${FILENAME}60.png ${FILENAME}72.png ${FILENAME}96.png ${FILENAME}256.png $FILENAME@3x.ico
cp ${FILENAME}16.png $FILENAME.png
cp ${FILENAME}32.png $FILENAME@2x.png
cp ${FILENAME}64.png $FILENAME@3x.png

for SIZE in $ALL_SIZES
do
rm $FILENAME$SIZE.png;
done
