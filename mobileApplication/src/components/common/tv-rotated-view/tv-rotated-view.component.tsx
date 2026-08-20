import React from 'react';
import { Dimensions, Platform, StyleSheet, View } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import { DeviceOrientation } from '../../../types/app.types';

export interface TvRotatedSize {
  width: number;
  height: number;
}

interface TvRotatedViewProps {
  children: (rotatedSize: TvRotatedSize | null) => React.ReactNode;
}

const TV_ROTATION_DEGREES: Record<DeviceOrientation, string> = {
  LANDSCAPE: '0deg',
  LANDSCAPE_FLIP: '180deg',
  PORTRAIT: '90deg',
  PORTRAIT_FLIP: '270deg'
};

export const TvRotatedView = ({ children }: TvRotatedViewProps): React.JSX.Element => {
  const orientation = useSelector((state: RootState) => state.device.orientation);

  if (!Platform.isTV) {
    return <>{children(null)}</>;
  }

  const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');
  const isSideways = orientation === 'PORTRAIT' || orientation === 'PORTRAIT_FLIP';
  const rotatedWidth = isSideways ? screenHeight : screenWidth;
  const rotatedHeight = isSideways ? screenWidth : screenHeight;

  return (
    <View style={styles.tvContainer}>
      <View
        collapsable={false}
        style={[
          styles.tvRotatedContent,
          {
            width: rotatedWidth,
            height: rotatedHeight,
            transform: [{ rotate: TV_ROTATION_DEGREES[orientation] }]
          }
        ]}
      >
        {children({ width: rotatedWidth, height: rotatedHeight })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tvContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  tvRotatedContent: {
    alignItems: 'center',
    justifyContent: 'center'
  }
});
