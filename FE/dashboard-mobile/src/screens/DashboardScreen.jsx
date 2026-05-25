/* screens/DashboardScreen.jsx - Mobile Native Version */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ScrollView } from 'react-native';
import { useSystem } from '../store/SystemContext';
import { PTZController } from '../components/PTZController';
import { formatTimestamp } from '../utils/helpers';
import { colors } from '../theme/colors';
import { api } from '../services/api';

const CameraCard = ({ id, name, isActive, onSelect, isOnline }) => {
    const [timestamp, setTimestamp] = useState("");

    useEffect(() => {
        const updateTime = () => setTimestamp(formatTimestamp(new Date()));
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    const showStream = id === 1 && isOnline;

    return (
        <Pressable
            style={[styles.cameraCard, isActive && styles.activeCard]}
            onPress={onSelect}
        >
            <View style={styles.videoContainer}>
                {showStream ? (
                    <Image
                        source={{ uri: api.getStreamUrl() }}
                        style={styles.streamFeed}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={styles.placeholderFeed}>
                        <Text style={styles.placeholderIcon}>📹</Text>
                        <Text style={styles.placeholderText}>SIMULATOR - CAM 0{id}</Text>
                        <Text style={styles.telemetryText}>FPS: 30.0 | 1080p | AGC: ON</Text>
                    </View>
                )}
                <View style={styles.scanLine} />
            </View>
            
            <View style={styles.overlayTop}>
                <View style={styles.badge}><Text style={styles.badgeText}>LIVE</Text></View>
                <Text style={styles.cameraLabel}>{name}</Text>
            </View>
            
            <View style={styles.overlayBottom}>
                <Text style={styles.timestampText}>{timestamp.split(' ')[0]}</Text>
                <Text style={styles.signalText}>📶 {id === 1 ? '100%' : id === 2 ? '92%' : id === 3 ? '98%' : '85%'}</Text>
            </View>
        </Pressable>
    );
};

export const DashboardScreen = () => {
    const {
        activeCameraId,
        setActiveCameraId,
        isCameraOnline,
        npuLoad,
        systemTemp,
        smokeValue,
        flameValue,
        smokeDetected,
        flameDetected,
        alerts
    } = useSystem();

    const cameras = [
        { id: 1, name: "Front Gate" },
        { id: 2, name: "Parking Lot" },
        { id: 3, name: "Lobby" },
        { id: 4, name: "Back Door" }
    ];

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>FIREEYE MOBILE</Text>
                    <Text style={styles.headerSubtitle}>Surveillance Control</Text>
                </View>
                <View style={styles.statusBox}>
                    <View style={[styles.dot, styles.onlineDot]} />
                    <Text style={styles.statusText}>{isCameraOnline ? "Dahua On" : "Dahua Off"}</Text>
                </View>
            </View>

            {/* 2x2 Grid */}
            <View style={styles.gridContainer}>
                <View style={styles.row}>
                    <CameraCard
                        id={1}
                        name="Front Gate"
                        isActive={activeCameraId === 1}
                        onSelect={() => setActiveCameraId(1)}
                        isOnline={isCameraOnline}
                    />
                    <CameraCard
                        id={2}
                        name="Parking Lot"
                        isActive={activeCameraId === 2}
                        onSelect={() => setActiveCameraId(2)}
                    />
                </View>
                <View style={styles.row}>
                    <CameraCard
                        id={3}
                        name="Lobby"
                        isActive={activeCameraId === 3}
                        onSelect={() => setActiveCameraId(3)}
                    />
                    <CameraCard
                        id={4}
                        name="Back Door"
                        isActive={activeCameraId === 4}
                        onSelect={() => setActiveCameraId(4)}
                    />
                </View>
            </View>

            {/* PTZ Controller */}
            <PTZController />

            {/* IoT & System Health info */}
            <View style={styles.infoSection}>
                <View style={styles.sensorCard}>
                    <Text style={styles.sectionHeader}>IoT Sensors</Text>
                    <View style={styles.sensorGrid}>
                        <View style={[styles.sensorTile, smokeDetected && styles.alarmTile]}>
                            <Text style={styles.sensorLabel}>SMOKE</Text>
                            <Text style={styles.sensorValue}>{smokeValue} ppm</Text>
                            <Text style={[styles.sensorStatus, smokeDetected && styles.alarmText]}>
                                {smokeDetected ? "ALARM" : "NORMAL"}
                            </Text>
                        </View>
                        <View style={[styles.sensorTile, flameDetected && styles.alarmTile]}>
                            <Text style={styles.sensorLabel}>FLAME</Text>
                            <Text style={styles.sensorValue}>{flameValue}%</Text>
                            <Text style={[styles.sensorStatus, flameDetected && styles.alarmText]}>
                                {flameDetected ? "ALARM" : "NORMAL"}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* System Stats */}
                <View style={styles.healthCard}>
                    <Text style={styles.sectionHeader}>NPU Status</Text>
                    <View style={styles.healthBox}>
                        <View style={styles.healthRow}>
                            <Text style={styles.healthLabel}>NPU Load:</Text>
                            <Text style={styles.healthValue}>{npuLoad.toFixed(1)}%</Text>
                        </View>
                        <View style={styles.healthRow}>
                            <Text style={styles.healthLabel}>Temp:</Text>
                            <Text style={styles.healthValue}>{systemTemp.toFixed(1)}°C</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Recent Alerts Feed */}
            <View style={styles.alertsCard}>
                <Text style={styles.sectionHeader}>Recent Alerts</Text>
                <View style={styles.alertsList}>
                    {alerts.map(alert => (
                        <View key={alert.id} style={styles.alertItem}>
                            <View style={[styles.alertIndicator, alert.level === 'high' && styles.alertIndicatorHigh]} />
                            <View style={styles.alertContent}>
                                <Text style={styles.alertTime}>[{alert.time}]</Text>
                                <Text style={styles.alertDesc}>{alert.desc}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgDeep,
    },
    contentContainer: {
        padding: 12,
        paddingBottom: 32,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderColor,
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: colors.accentCyan,
        letterSpacing: 1,
    },
    headerSubtitle: {
        fontSize: 10,
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 2,
    },
    statusBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgPanel,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.borderColor,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    onlineDot: {
        backgroundColor: colors.accentGreen,
    },
    statusText: {
        color: colors.textPrimary,
        fontSize: 11,
        fontWeight: '600',
    },
    gridContainer: {
        gap: 8,
        marginBottom: 8,
    },
    row: {
        flexDirection: 'row',
        gap: 8,
    },
    cameraCard: {
        flex: 1,
        aspectRatio: 1.6,
        backgroundColor: colors.bgPanel,
        borderWidth: 1,
        borderColor: colors.borderColor,
        borderRadius: 10,
        overflow: 'hidden',
        position: 'relative',
    },
    activeCard: {
        borderColor: colors.accentCyan,
    },
    videoContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    streamFeed: {
        width: '100%',
        height: '100%',
    },
    placeholderFeed: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
    },
    placeholderIcon: {
        fontSize: 16,
        marginBottom: 2,
    },
    placeholderText: {
        color: colors.textSecondary,
        fontSize: 9,
        fontWeight: '700',
    },
    telemetryText: {
        color: colors.textMuted,
        fontSize: 7,
        fontFamily: 'monospace',
        marginTop: 2,
    },
    scanLine: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: colors.accentCyan,
        opacity: 0.15,
    },
    overlayTop: {
        position: 'absolute',
        top: 8,
        left: 8,
        right: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    badge: {
        backgroundColor: colors.accentRed,
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 2,
    },
    badgeText: {
        color: '#fff',
        fontSize: 8,
        fontWeight: '900',
    },
    cameraLabel: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '700',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 2,
    },
    overlayBottom: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        right: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timestampText: {
        color: '#fff',
        fontSize: 8,
        fontFamily: 'monospace',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 2,
    },
    signalText: {
        color: '#fff',
        fontSize: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 2,
    },
    infoSection: {
        flexDirection: 'row',
        gap: 8,
        marginVertical: 8,
    },
    sensorCard: {
        flex: 2,
        backgroundColor: colors.bgPanel,
        borderWidth: 1,
        borderColor: colors.borderColor,
        borderRadius: 12,
        padding: 12,
    },
    sectionHeader: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    sensorGrid: {
        flexDirection: 'row',
        gap: 6,
    },
    sensorTile: {
        flex: 1,
        backgroundColor: colors.bgCard,
        borderWidth: 1,
        borderColor: colors.borderColor,
        borderRadius: 6,
        padding: 6,
    },
    alarmTile: {
        borderColor: colors.accentRed,
    },
    sensorLabel: {
        fontSize: 8,
        fontWeight: '600',
        color: colors.textMuted,
    },
    sensorValue: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textPrimary,
        marginVertical: 2,
    },
    sensorStatus: {
        fontSize: 8,
        fontWeight: '700',
        color: colors.accentGreen,
    },
    alarmText: {
        color: colors.accentRed,
    },
    healthCard: {
        flex: 1.2,
        backgroundColor: colors.bgPanel,
        borderWidth: 1,
        borderColor: colors.borderColor,
        borderRadius: 12,
        padding: 12,
    },
    healthBox: {
        gap: 4,
        justifyContent: 'center',
        flex: 1,
    },
    healthRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    healthLabel: {
        fontSize: 9,
        color: colors.textMuted,
    },
    healthValue: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    alertsCard: {
        backgroundColor: colors.bgPanel,
        borderColor: colors.borderColor,
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        marginTop: 8,
    },
    alertsList: {
        gap: 6,
    },
    alertItem: {
        flexDirection: 'row',
        backgroundColor: colors.bgCard,
        borderWidth: 1,
        borderColor: colors.borderColor,
        borderRadius: 6,
        paddingVertical: 8,
        paddingHorizontal: 10,
        alignItems: 'center',
    },
    alertIndicator: {
        width: 4,
        height: 16,
        backgroundColor: colors.accentCyan,
        borderRadius: 2,
        marginRight: 8,
    },
    alertIndicatorHigh: {
        backgroundColor: colors.accentRed,
    },
    alertContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    alertTime: {
        fontSize: 9,
        fontFamily: 'monospace',
        color: colors.accentCyan,
        marginRight: 6,
        fontWeight: '600',
    },
    alertDesc: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.textPrimary,
        flex: 1,
    },
});
