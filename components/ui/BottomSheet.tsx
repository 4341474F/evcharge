import { forwardRef, useCallback } from 'react';
import GorhomBottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { StyleSheet } from 'react-native';

interface BottomSheetProps {
  snapPoints: (string | number)[];
  children: React.ReactNode;
  onClose?: () => void;
}

const BottomSheet = forwardRef<GorhomBottomSheet, BottomSheetProps>(
  ({ snapPoints, children, onClose }, ref) => {
    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      ),
      [],
    );

    return (
      <GorhomBottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        onClose={onClose}
        renderBackdrop={renderBackdrop}
        backgroundStyle={styles.background}
        handleIndicatorStyle={styles.indicator}
      >
        <BottomSheetView style={styles.content}>{children}</BottomSheetView>
      </GorhomBottomSheet>
    );
  },
);

BottomSheet.displayName = 'BottomSheet';

const styles = StyleSheet.create({
  background: {
    backgroundColor: '#1A2332',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  indicator: {
    backgroundColor: '#4B5563',
    width: 40,
  },
  content: {
    flex: 1,
  },
});

export default BottomSheet;
