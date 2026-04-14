import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Surface, Text, IconButton } from 'react-native-paper';
import { Train, RefreshCcw } from 'lucide-react-native';
import { format } from 'date-fns';

export const WidgetPreview = ({ station, arrivals, loading, onRefresh }) => {
  const nextArrival = arrivals && arrivals[0];
  
  return (
    <Surface style={styles.container} elevation={2}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Train size={16} color="#fff" />
          <Text style={styles.title}>Link Arrival</Text>
        </View>
        <Text style={styles.time}>{format(new Date(), 'h:mm a')}</Text>
      </View>
      
      <View style={styles.body}>
        <Text style={styles.stationName} numberOfLines={1}>
          {station || 'Select Station'}
        </Text>
        
        {loading ? (
          <Text style={styles.loadingText}>Fetching...</Text>
        ) : nextArrival ? (
          <View style={styles.arrivalInfo}>
            <View>
              <Text style={styles.headsign}>{nextArrival.tripHeadsign}</Text>
              <Text style={styles.status}>
                {nextArrival.predicted ? 'Live' : 'Scheduled'}
              </Text>
            </View>
            <View style={styles.timeContainer}>
              <Text style={styles.minutes}>
                {Math.max(0, Math.round((new Date(nextArrival.predictedArrivalTime || nextArrival.scheduledArrivalTime) - new Date()) / 60000))}
              </Text>
              <Text style={styles.minLabel}>min</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.noData}>No trains</Text>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.dot} />
        <Text style={styles.footerText}>Sound Transit</Text>
        <IconButton 
          icon={() => <RefreshCcw size={12} color="#888" />} 
          size={12} 
          style={styles.refreshBtn}
          onPress={onRefresh}
        />
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 155, // Small widget size approximate
    height: 155,
    borderRadius: 22,
    backgroundColor: '#fff',
    overflow: 'hidden',
    padding: 12,
    justifyContent: 'space-between',
    alignSelf: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0055A5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  title: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 3,
  },
  time: {
    fontSize: 9,
    color: '#888',
  },
  body: {
    flex: 1,
    justifyContent: 'center',
  },
  stationName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  arrivalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headsign: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1a1a1a',
    maxWidth: 80,
  },
  status: {
    fontSize: 10,
    color: '#00a86b',
    fontWeight: '600',
  },
  timeContainer: {
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
    padding: 6,
    borderRadius: 10,
  },
  minutes: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0055A5',
  },
  minLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#0055A5',
    marginTop: -4,
  },
  loadingText: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
  },
  noData: {
    fontSize: 10,
    color: '#999',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFCD00',
    marginRight: 4,
  },
  footerText: {
    fontSize: 8,
    color: '#aaa',
    fontWeight: 'bold',
    letterSpacing: 0.5,
    flex: 1,
  },
  refreshBtn: {
    margin: 0,
    padding: 0,
  }
});
