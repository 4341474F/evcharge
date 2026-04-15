import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onLocate: () => void;
}

export function ZoomControls({ onZoomIn, onZoomOut, onLocate }: ZoomControlsProps) {
  return (
    <View style={styles.column}>
      <View style={styles.zoomGroup}>
        <TouchableOpacity style={styles.btn} onPress={onZoomIn}>
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.btn} onPress={onZoomOut}>
          <Ionicons name="remove" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.locateBtn} onPress={onLocate}>
        <Ionicons name="locate" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    gap: 8,
    alignItems: 'center',
  },
  zoomGroup: {
    backgroundColor: '#1A2332',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D3748',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  btn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#2D3748',
  },
  locateBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1A2332',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D3748',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});
