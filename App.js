import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  RefreshControl, 
  KeyboardAvoidingView, 
  Platform,
  Alert,
  NativeModules,
  TouchableOpacity
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { 
  Provider as PaperProvider, 
  MD3LightTheme, 
  Text, 
  Card, 
  ActivityIndicator, 
  FAB, 
  Portal, 
  Modal, 
  TextInput, 
  Button, 
  List,
  IconButton,
  Surface
} from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { format, differenceInMinutes } from 'date-fns';
import { fetchArrivals, getRouteStops } from './src/api/oba';
import { getPreferences, savePreferences, findActivePreference } from './src/utils/preferences';
import { Train, Clock, Settings, Plus, MapPin, Trash2, Home, ChevronRight, Navigation } from 'lucide-react-native';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0055A5', // Link Blue
    secondary: '#FFCD00', // Accent Yellow
    surface: '#F8F9FA',
  },
};

export default function App() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [preferences, setPreferences] = useState([]);
  const [activePref, setActivePref] = useState(null);
  const [arrivals, setArrivals] = useState([]);
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const [stops, setStops] = useState([]);
  const [manualStop, setManualStop] = useState(null); // Manual override stop
  const [stationModalVisible, setStationModalVisible] = useState(false);
  const [directionModalVisible, setDirectionModalVisible] = useState(false);
  const [tempStation, setTempStation] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPref, setEditingPref] = useState(null);
  const [newPref, setNewPref] = useState({
    name: 'Commute',
    startTime: '08:00',
    endTime: '10:00',
    stationId: '',
    stopId: '',
    stopName: '',
    direction: 'NB',
  });
  const [syncInterval, setSyncInterval] = useState(15);
  const [showTimePicker, setShowTimePicker] = useState({ show: false, field: 'startTime' });

  const onTimeChange = (event, selectedDate) => {
    setShowTimePicker({ ...showTimePicker, show: false });
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const mins = selectedDate.getMinutes().toString().padStart(2, '0');
      setNewPref({ ...newPref, [showTimePicker.field]: `${hours}:${mins}` });
    }
  };

  const getTimeDate = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(h);
    date.setMinutes(m);
    return date;
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const savedPrefs = await getPreferences();
      setPreferences(savedPrefs);
      if (NativeModules.WidgetModule) {
        NativeModules.WidgetModule.updatePreferences(JSON.stringify(savedPrefs));
      }
      
      const routeStops = await getRouteStops();
      setStops(routeStops);

      const active = findActivePreference(savedPrefs);
      setActivePref(active);

      const current = manualStop || active;

      if (current) {
        // Find the correct stopId based on stored station and direction
        const station = routeStops.find(s => s.id === current.stationId || s.id === current.stopId);
        const actualStopId = current.stopId || (current.direction === 'NB' ? station?.nbStopId : station?.sbStopId);
        
        if (actualStopId) {
          const { arrivals: data, serverTime } = await fetchArrivals(actualStopId);
          const currentLocal = Date.now();
          const offset = serverTime - currentLocal;
          setServerTimeOffset(offset);
          setArrivals(data);
          
          if (data && data.length > 0 && NativeModules.WidgetModule) {
            const cache = data.slice(0, 10).map(t => ({
              h: t.tripHeadsign,
              epoch: t.predictedArrivalTime || t.scheduledArrivalTime,
              l: (t.routeShortName && t.routeShortName.includes('2')) ? '2' : '1'
            }));

            NativeModules.WidgetModule.updateWidget(
              actualStopId,
              current.stopName || current.name, 
              JSON.stringify(cache),
              syncInterval,
              offset,
              currentLocal
            );
          }
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [manualStop, syncInterval]);

  useEffect(() => {
    loadData();
  }, [loadData, manualStop]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const current = manualStop || activePref;
      if (current) {
        const station = stops.find(s => s.id === current.stationId || s.id === current.stopId);
        const actualStopId = current.stopId || (current.direction === 'NB' ? station?.nbStopId : station?.sbStopId);
        
        if (actualStopId) {
          const { arrivals: data, serverTime } = await fetchArrivals(actualStopId);
          const currentLocal = Date.now();
          const offset = serverTime - currentLocal;
          setServerTimeOffset(offset);
          setArrivals(data);

          if (data && data.length > 0 && NativeModules.WidgetModule) {
            const cache = data.slice(0, 10).map(t => ({
              h: t.tripHeadsign,
              epoch: t.predictedArrivalTime || t.scheduledArrivalTime,
              l: (t.routeShortName && t.routeShortName.includes('2')) ? '2' : '1'
            }));

            NativeModules.WidgetModule.updateWidget(
              actualStopId,
              current.stopName || current.name, 
              JSON.stringify(cache),
              syncInterval,
              offset,
              currentLocal
            );
          }
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  }, [activePref]);

  const handleAddPref = () => {
    setEditingPref(null);
    setNewPref({
      name: 'New Schedule',
      startTime: '07:00',
      endTime: '09:00',
      stationId: stops[0]?.id || '',
      stopId: stops[0]?.nbStopId || '',
      stopName: stops[0]?.name || '',
      direction: 'NB',
    });
    setModalVisible(true);
  };

  const handleSavePref = async () => {
    let updated;
    if (editingPref !== null) {
      updated = preferences.map((p, i) => i === editingPref ? newPref : p);
    } else {
      updated = [...preferences, newPref];
    }
    setPreferences(updated);
    await savePreferences(updated);
    if (NativeModules.WidgetModule) {
      NativeModules.WidgetModule.updatePreferences(JSON.stringify(updated));
    }
    setModalVisible(false);
    loadData();
  };

  const handleDeletePref = async (index) => {
    const updated = preferences.filter((_, i) => i !== index);
    setPreferences(updated);
    await savePreferences(updated);
    loadData();
  };

  const renderArrival = (arrival, index) => {
    const time = arrival.predictedArrivalTime || arrival.scheduledArrivalTime;
    const currentTime = Date.now() + serverTimeOffset;
    const diffMin = Math.floor((time - currentTime) / 60000);
    
    if (diffMin < -1) return null; // Hide trains more than 1 minute past departure
    
    const diff = Math.max(0, diffMin); // Prevent negative numbers
    const isNow = diff <= 1;
    const uniqueKey = `${arrival.tripId || index}-${arrival.stopId}`;

    return (
      <Card key={uniqueKey} style={styles.arrivalCard}>
        <Card.Content style={styles.arrivalContent}>
          <View>
            <Text variant="titleLarge" style={styles.headsign}>{arrival.tripHeadsign}</Text>
            <Text variant="bodyMedium" style={styles.arrivalSubtext}>
               {arrival.predicted ? 'Real-time' : 'Scheduled'} • {format(new Date(time), 'h:mm a')}
            </Text>
          </View>
          <View style={[styles.timeBadge, isNow ? styles.nowBadge : {}]}>
            <Text style={[styles.timeValue, isNow ? styles.nowValue : {}]}>
              {isNow ? 'NOW' : `${diff}m`}
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <SafeAreaView style={styles.container}>
          <StatusBar style="dark" />
          
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
          >
            <View style={styles.header}>
              <View>
                <Text variant="headlineMedium" style={styles.title}>Link Arrivals</Text>
                {manualStop ? (
                  <Text variant="bodyLarge" style={styles.subtitle}>
                    Manual View: <Text style={styles.bold}>{manualStop.stopName}</Text>
                  </Text>
                ) : activePref ? (
                  <Text variant="bodyLarge" style={styles.subtitle}>
                    Schedule: <Text style={styles.bold}>{activePref.name}</Text>
                  </Text>
                ) : (
                  <Text variant="bodyLarge" style={styles.subtitle}>No active schedule</Text>
                )}
              </View>
              {manualStop && (
                <IconButton 
                  icon={() => <Home size={24} color={theme.colors.primary} />} 
                  onPress={() => {
                    setManualStop(null);
                    loadData();
                  }} 
                />
              )}
            </View>

            {loading && !refreshing ? (
              <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
            ) : (
              <>
                <Surface 
                  style={styles.activeStationSurface} 
                  elevation={1}
                >
                  <TouchableOpacity onPress={() => setStationModalVisible(true)}>
                    <View style={styles.stationHeader}>
                      <MapPin size={20} color={theme.colors.primary} />
                      <Text variant="titleMedium" style={styles.stationName}>
                        {manualStop ? manualStop.stopName : (activePref ? activePref.stopName : 'Tap to select station')}
                      </Text>
                      <ChevronRight size={16} color="#ccc" style={{ marginLeft: 'auto' }} />
                    </View>
                    {(manualStop || activePref) && (
                      <Text variant="bodySmall" style={styles.directionText}>
                        Direction: {(manualStop || activePref).direction === 'NB' ? 'Northbound' : 'Southbound'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </Surface>

                <View style={styles.arrivalsContainer}>
                  {arrivals.length > 0 ? (
                    arrivals.slice(0, 5).map(renderArrival)
                  ) : (
                    <Text style={styles.emptyText}>No upcoming arrivals found.</Text>
                  )}
                </View>

                <View style={styles.prefSection}>
                  <Text variant="titleMedium" style={styles.sectionHeader}>Your Schedules</Text>
                  {preferences.map((pref, i) => (
                    <List.Item
                      key={i}
                      title={pref.name}
                      description={`${format(getTimeDate(pref.startTime), 'h:mm a')} - ${format(getTimeDate(pref.endTime), 'h:mm a')} • ${pref.stopName} (${pref.direction})`}
                      left={props => <List.Icon {...props} icon={() => <Clock size={20} color="#666" />} />}
                      right={props => (
                        <View style={{ flexDirection: 'row' }}>
                          <IconButton {...props} icon={() => <Trash2 size={20} color="#ff4444" />} onPress={() => handleDeletePref(i)} />
                        </View>
                      )}
                      onPress={() => {
                        setEditingPref(i);
                        setNewPref(pref);
                        setModalVisible(true);
                      }}
                      style={styles.prefItem}
                    />
                  ))}
                </View>
              </>
            )}
            
            <View style={styles.footerSpacer} />
          </ScrollView>

          {/* Manual Station Selection Modal */}
          <Portal>
            <Modal 
              visible={stationModalVisible} 
              onDismiss={() => setStationModalVisible(false)} 
              contentContainerStyle={styles.modal}
            >
              <Text variant="headlineSmall" style={styles.modalTitle}>Select Station</Text>
              <ScrollView style={styles.stopSelector}>
                {stops.map((station, index) => (
                  <List.Item
                    key={index}
                    title={station.name}
                    onPress={() => {
                      setTempStation(station);
                      setStationModalVisible(false);
                      setDirectionModalVisible(true);
                    }}
                    style={styles.stopItem}
                    left={props => <List.Icon {...props} icon="map-marker" />}
                  />
                ))}
              </ScrollView>
            </Modal>

            <Modal
              visible={directionModalVisible}
              onDismiss={() => setDirectionModalVisible(false)}
              contentContainerStyle={styles.modal}
            >
              <Text variant="headlineSmall" style={styles.modalTitle}>Select Direction</Text>
              <Text variant="bodyLarge" style={{ marginBottom: 24, textAlign: 'center', color: theme.colors.primary, fontWeight: 'bold' }}>
                {tempStation?.name}
              </Text>
              <View style={styles.directionRow}>
                <Button 
                  mode="contained" 
                  onPress={() => {
                    setManualStop({
                      stopId: tempStation.nbStopId,
                      stopName: tempStation.name,
                      direction: 'NB'
                    });
                    setDirectionModalVisible(false);
                  }}
                  style={styles.dirBtn}
                  icon="arrow-up"
                >Northbound</Button>
                <Button 
                  mode="contained" 
                  onPress={() => {
                    setManualStop({
                      stopId: tempStation.sbStopId,
                      stopName: tempStation.name,
                      direction: 'SB'
                    });
                    setDirectionModalVisible(false);
                  }}
                  style={styles.dirBtn}
                  icon="arrow-down"
                >Southbound</Button>
              </View>
            </Modal>
          </Portal>

          {/* Preference Edit Modal */}
          <Portal>
            <Modal
              visible={modalVisible}
              onDismiss={() => setModalVisible(false)}
              contentContainerStyle={styles.modal}
            >
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <Text variant="headlineSmall" style={styles.modalTitle}>
                  {editingPref !== null ? 'Edit Schedule' : 'Add Schedule'}
                </Text>
                
                <TextInput
                  label="Name (e.g. Work Morning)"
                  value={newPref.name}
                  onChangeText={text => setNewPref({...newPref, name: text})}
                  mode="outlined"
                  style={styles.input}
                />

                <View style={styles.row}>
                  <TouchableOpacity 
                    style={[styles.timeBtn, { marginRight: 8 }]} 
                    onPress={() => setShowTimePicker({ show: true, field: 'startTime' })}
                  >
                    <Text variant="labelSmall" style={styles.timeLabel}>START</Text>
                    <Text variant="titleLarge">
                      {format(getTimeDate(newPref.startTime), 'h:mm a')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.timeBtn} 
                    onPress={() => setShowTimePicker({ show: true, field: 'endTime' })}
                  >
                    <Text variant="labelSmall" style={styles.timeLabel}>END</Text>
                    <Text variant="titleLarge">
                      {format(getTimeDate(newPref.endTime), 'h:mm a')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {showTimePicker.show && (
                  <DateTimePicker
                    value={getTimeDate(newPref[showTimePicker.field])}
                    mode="time"
                    is24Hour={false}
                    onChange={onTimeChange}
                  />
                )}

                <Text style={styles.label}>Select Direction</Text>
                <View style={styles.directionRow}>
                  <Button 
                    mode={newPref.direction === 'NB' ? 'contained' : 'outlined'} 
                    onPress={() => {
                      const station = stops.find(s => s.id === newPref.stationId);
                      setNewPref({
                        ...newPref, 
                        direction: 'NB', 
                        stopId: station?.nbStopId || ''
                      });
                    }}
                    style={styles.dirBtn}
                    icon="arrow-up"
                  >
                    Northbound
                  </Button>
                  <Button 
                    mode={newPref.direction === 'SB' ? 'contained' : 'outlined'} 
                    onPress={() => {
                      const station = stops.find(s => s.id === newPref.stationId);
                      setNewPref({
                        ...newPref, 
                        direction: 'SB', 
                        stopId: station?.sbStopId || ''
                      });
                    }}
                    style={styles.dirBtn}
                    icon="arrow-down"
                  >
                    Southbound
                  </Button>
                </View>

                <Text style={styles.label}>Select Station</Text>
                <ScrollView style={styles.stopSelector}>
                  {stops.map((station, index) => {
                    const stopKey = `station-${station.id}-${index}`;
                    return (
                      <List.Item
                        key={stopKey}
                        title={station.name}
                        onPress={() => {
                          const stopId = newPref.direction === 'NB' ? station.nbStopId : station.sbStopId;
                          setNewPref({
                            ...newPref, 
                            stationId: station.id, 
                            stopName: station.name,
                            stopId: stopId || ''
                          });
                        }}
                        style={[
                          styles.stopItem,
                          newPref.stationId === station.id && { backgroundColor: '#e3f2fd' }
                        ]}
                        right={props => newPref.stationId === station.id ? <List.Icon {...props} icon="check" color={theme.colors.primary} /> : null}
                      />
                    );
                  })}
                </ScrollView>

                <Button 
                  mode="contained" 
                  onPress={handleSavePref} 
                  style={styles.saveButton}
                  disabled={!newPref.stopId}
                >
                  Save Schedule
                </Button>
              </KeyboardAvoidingView>
            </Modal>
          </Portal>

          <FAB
            icon={() => <Plus color="white" />}
            style={styles.fab}
            onPress={handleAddPref}
            label="New"
          />
        </SafeAreaView>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontWeight: '800',
    color: '#1a1a1a',
  },
  subtitle: {
    color: '#666',
    marginTop: 4,
  },
  bold: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  loader: {
    marginTop: 50,
  },
  activeStationSurface: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  previewLabel: {
    color: '#aaa',
    marginBottom: 10,
    letterSpacing: 1,
    fontSize: 10,
  },
  stationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  stationName: {
    marginLeft: 8,
    fontWeight: 'bold',
  },
  directionText: {
    color: '#888',
    marginLeft: 28,
  },
  arrivalsContainer: {
    marginBottom: 30,
  },
  arrivalCard: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  arrivalContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headsign: {
    fontWeight: '700',
    color: '#333',
  },
  arrivalSubtext: {
    color: '#888',
  },
  timeBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  nowBadge: {
    backgroundColor: theme.colors.primary,
  },
  timeValue: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#333',
  },
  nowValue: {
    color: '#fff',
  },
  prefSection: {
    marginTop: 10,
  },
  sectionHeader: {
    marginBottom: 10,
    fontWeight: 'bold',
    color: '#444',
  },
  prefItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
  modal: {
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 24,
    margin: 20,
    borderRadius: 24,
    maxHeight: '90%',
  },
  modalTitle: {
    marginBottom: 24,
    marginTop: 10,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  stopSelector: {
    maxHeight: 200,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
  },
  stopItem: {
    paddingVertical: 4,
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 4,
  },
  directionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dirBtn: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  timeBtn: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  timeLabel: {
    color: '#888',
    marginBottom: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
  },
  footerSpacer: {
    height: 80,
  }
});
