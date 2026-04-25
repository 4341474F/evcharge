import {
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  type ReactNode,
} from "react";
import {
  View,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
  PanResponder,
} from "react-native";

const SCREEN_HEIGHT = Dimensions.get("window").height;

export interface BottomSheetHandle {
  expand: () => void;
  close: () => void;
}

interface BottomSheetProps {
  children: ReactNode;
  onClose?: () => void;
  snapPercent?: number; // 0-1, default 0.5
}

const BottomSheet = forwardRef<BottomSheetHandle, BottomSheetProps>(
  ({ children, onClose, snapPercent = 0.5 }, ref) => {
    const sheetHeight = SCREEN_HEIGHT * snapPercent;
    const translateY = useRef(new Animated.Value(sheetHeight)).current;
    const [visible, setVisible] = useState(false);

    const open = () => {
      setVisible(true);
      translateY.setValue(sheetHeight);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 180,
      }).start();
    };

    const close = () => {
      Animated.timing(translateY, {
        toValue: sheetHeight,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
        onClose?.();
      });
    };

    useImperativeHandle(ref, () => ({ expand: open, close }));

    const panResponder = useRef(
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
        onPanResponderMove: (_, g) => {
          if (g.dy > 0) translateY.setValue(g.dy);
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > sheetHeight * 0.35 || g.vy > 0.5) {
            close();
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    ).current;

    if (!visible) return null;

    return (
      <View style={[StyleSheet.absoluteFill, styles.wrapper]}>
        <TouchableWithoutFeedback onPress={close}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.sheet,
            { height: sheetHeight, transform: [{ translateY }] },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.handle} />
          {children}
        </Animated.View>
      </View>
    );
  },
);

BottomSheet.displayName = "BottomSheet";
export default BottomSheet;

const styles = StyleSheet.create({
  wrapper: {
    zIndex: 999,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: "#1A2332",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    overflow: "hidden",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#4B5563",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
});
