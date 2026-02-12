import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useTheme } from "@/context/ThemeContext";

export interface NavigationStep {
  instruction: string;
  distance: number; // meters
  duration: number; // seconds
  maneuver: {
    type: string;
    modifier?: string;
  };
}

interface NavigationOverlayProps {
  currentStep: NavigationStep | null;
  nextStep: NavigationStep | null;
  distanceToNextTurn: number; // meters
  totalDistanceRemaining: number; // meters
  totalTimeRemaining: number; // seconds
  stationName: string;
  onStop: () => void;
}

const getManeuverIcon = (type: string, modifier?: string): string => {
  if (type === "turn") {
    if (modifier?.includes("left")) return "arrow-left";
    if (modifier?.includes("right")) return "arrow-right";
    return "arrow-up";
  }
  if (type === "fork" || type === "off ramp") {
    if (modifier?.includes("left")) return "code-fork";
    return "code-fork";
  }
  if (type === "roundabout" || type === "rotary") return "refresh";
  if (type === "merge") return "compress";
  if (type === "arrive") return "flag-checkered";
  if (type === "depart") return "play";
  return "arrow-up"; // straight/continue
};

const formatDistance = (meters: number): string => {
  if (meters < 100) return `${Math.round(meters)} m`;
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return "< 1 min";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hrs}h ${remainMins}m`;
};

export default function NavigationOverlay({
  currentStep,
  nextStep,
  distanceToNextTurn,
  totalDistanceRemaining,
  totalTimeRemaining,
  stationName,
  onStop,
}: NavigationOverlayProps) {
  const { colors } = useTheme();

  if (!currentStep) return null;

  const icon = getManeuverIcon(
    currentStep.maneuver.type,
    currentStep.maneuver.modifier,
  );

  return (
    <>
      {/* Top instruction card */}
      <View style={[styles.topCard, { backgroundColor: colors.tint }]}>
        <View style={styles.instructionRow}>
          <View style={styles.iconContainer}>
            <FontAwesome name={icon as any} size={28} color="#FFFFFF" />
          </View>
          <View style={styles.instructionTextContainer}>
            <Text style={styles.distanceToTurn}>
              {formatDistance(distanceToNextTurn)}
            </Text>
            <Text style={styles.instruction} numberOfLines={2}>
              {currentStep.instruction}
            </Text>
          </View>
        </View>
        {nextStep && (
          <View style={styles.nextStepRow}>
            <Text style={styles.nextLabel}>Then</Text>
            <FontAwesome
              name={
                getManeuverIcon(
                  nextStep.maneuver.type,
                  nextStep.maneuver.modifier,
                ) as any
              }
              size={14}
              color="rgba(255,255,255,0.7)"
            />
            <Text style={styles.nextInstruction} numberOfLines={1}>
              {nextStep.instruction}
            </Text>
          </View>
        )}
      </View>

      {/* Bottom info bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.card }]}>
        <View style={styles.etaInfo}>
          <Text style={[styles.etaTime, { color: colors.tint }]}>
            {formatDuration(totalTimeRemaining)}
          </Text>
          <Text style={[styles.etaDistance, { color: colors.textSecondary }]}>
            {formatDistance(totalDistanceRemaining)} · {stationName}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.stopButton, { backgroundColor: "#FF3B30" }]}
          onPress={onStop}
          activeOpacity={0.7}
        >
          <FontAwesome name="stop" size={14} color="#FFFFFF" />
          <Text style={styles.stopText}>Stop</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  topCard: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 8,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 10,
  },
  instructionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  instructionTextContainer: {
    flex: 1,
    marginLeft: 14,
  },
  distanceToTurn: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  instruction: {
    fontSize: 15,
    color: "rgba(255,255,255,0.9)",
    marginTop: 2,
  },
  nextStepRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
    gap: 8,
  },
  nextLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "600",
  },
  nextInstruction: {
    flex: 1,
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
  },
  bottomBar: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  etaInfo: {
    flex: 1,
  },
  etaTime: {
    fontSize: 20,
    fontWeight: "700",
  },
  etaDistance: {
    fontSize: 13,
    marginTop: 2,
  },
  stopButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  stopText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
});
