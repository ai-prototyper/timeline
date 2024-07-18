import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import periods from './periods.json';
import events from './events.json';

const Popup = ({ content, position, type }) => {
  const formatYear = (year) => {
    if (year < 0) {
      return `${Math.abs(year)} BCE`;
    } else {
      return `${year} CE`;
    }
  };
//blah
  return (
    <div style={{
      position: 'absolute',
      top: `${position.y}px`,
      left: `${position.x}px`,
      backgroundColor: 'white',
      border: '1px solid #ccc',
      borderRadius: '5px',
      padding: '8px',
      zIndex: 1000,
      maxWidth: '300px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    }}>
      <div style={{ fontSize: '10px', color: '#555', marginBottom: '4px' }}>
        {type === 'event' ? 'Event' : type === 'period' ? 'Period' : 'Cluster'}
      </div>
      {type === 'event' ? (
        <>
          <h3 style={{ margin: '0 0 4px 0' }}>{content.name || content.event || 'Unknown Event'}</h3>
          <div style={{ fontStyle: 'italic', fontSize: '12px', marginBottom: '4px' }}>
            (year: {formatYear(content.year)}; era: {content.era || 'Unknown Era'})
          </div>
          <p style={{ margin: '0' }}>{content.description || content.explanation || 'No description available'}</p>
        </>
      ) : type === 'period' ? (
        <>
          <h3 style={{ margin: '0 0 4px 0' }}>{content.name}</h3>
          <div style={{ fontSize: '12px', marginBottom: '4px' }}>
            From: {formatYear(content.start)} <br />
            To: {formatYear(content.end)}
          </div>
        </>
      ) : (
        <>
          <h3 style={{ margin: '0 0 4px 0' }}>Clustered Events</h3>
          <ul style={{ margin: '0', padding: '0 0 0 20px' }}>
            {content.events.sort((a, b) => a.year - b.year).map((event, index) => (
              <li key={index} style={{ fontSize: '12px', marginBottom: '4px' }}>
                {formatYear(event.year)}: {event.event}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

const MultiLevelHierarchicalTimeline = () => {
  const totalStart = -10000;
  const totalEnd = 2023;
  const totalTimeRange = totalEnd - totalStart; // This will now be 12023
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedParent] = useState(null);
  const [timelineStart, setTimelineStart] = useState(-5000);
  const [timelineEnd, setTimelineEnd] = useState(2000);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const timelineRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const sliderPosition = useMemo(() => {
    return ((timelineStart - totalStart) / totalTimeRange) * 100;
  }, [timelineStart, totalStart, totalTimeRange]);  
  const [selectedEventId, setSelectedEventId] = useState(null);



  const sliderRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartPosition, setDragStartPosition] = useState(0);

  const handleWidth = useMemo(() => {
    const visibleRange = timelineEnd - timelineStart;
    return Math.max((visibleRange / totalTimeRange) * 100, 1);
  }, [timelineStart, timelineEnd, totalTimeRange]);

  const formatYear = (year) => {
    if (year < 0) {
      return `${Math.abs(year)} BCE`;
    } else {
      return `${year} CE`;
    }
  };

  const handleSliderChange = useCallback((newPosition) => {
    // Limit the maximum position to prevent sliding off the right side
    const maxPosition = 100 - handleWidth;
    newPosition = Math.max(0, Math.min(newPosition, maxPosition));
  
    let newStart = totalStart + (newPosition / 100) * totalTimeRange;
    const visibleRange = timelineEnd - timelineStart;
    let newEnd = newStart + visibleRange;
  
    // Prevent scrolling beyond the timeline end
    if (newEnd > totalEnd) {
      newEnd = totalEnd;
      newStart = newEnd - visibleRange;
    }
  
    setTimelineStart(newStart);
    setTimelineEnd(newEnd);
  }, [timelineStart, timelineEnd, handleWidth, totalStart, totalTimeRange]);


  const handleMouseDown = useCallback((e) => {
    const sliderRect = sliderRef.current.getBoundingClientRect();
    const handleWidthPx = (sliderRect.width * handleWidth) / 100;
    const handleLeft = (sliderRect.width * sliderPosition) / 100;
    
    if (e.clientX >= sliderRect.left + handleLeft && e.clientX <= sliderRect.left + handleLeft + handleWidthPx) {
      setIsDragging(true);
      setDragStartX(e.clientX);
      setDragStartPosition(sliderPosition);
    }
  }, [handleWidth, sliderPosition]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging && sliderRef.current) {
      const sliderRect = sliderRef.current.getBoundingClientRect();
      const dragDistance = e.clientX - dragStartX;
      const dragPercent = (dragDistance / sliderRect.width) * 100;
      const newPosition = dragStartPosition + dragPercent;
      handleSliderChange(newPosition);
    }
  }, [isDragging, dragStartX, dragStartPosition, handleSliderChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const currentPeriods = useMemo(() => {
    const filteredPeriods = periods.filter(period => period.parent === selectedParent);
    filteredPeriods.sort((a, b) => a.start - b.start);
    return filteredPeriods;
  }, [selectedParent]);

  const filteredEvents = useMemo(() => {
    return events.filter(event => event.year >= timelineStart && event.year <= timelineEnd);
  }, [timelineStart, timelineEnd]);

  const handleEventClick = (event) => {
    const eventWithVideoData = {
      ...event,
      videoData: event.url ? {
        url: event.url,
        startTime: event.startTime,
        endTime: event.endTime
      } : null
    };
    setSelectedEvent(eventWithVideoData);
    setSelectedEventId(event.id || `${event.year}-${event.event.replace(/\s+/g, '-')}`);
    const eventKey = `event-${event.id || `${event.year}-${event.event.replace(/\s+/g, '-')}`}`;
    const element = document.getElementById(eventKey);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
  };

  const handleCloseEventCard = () => {
    setSelectedEvent(null);
    setSelectedEventId(null);
  };

  const getPosition = useCallback((year) => {
    if (year < timelineStart) return 0;
    if (year > timelineEnd) return 100;
    return ((year - timelineStart) / (timelineEnd - timelineStart)) * 100;
  }, [timelineStart, timelineEnd]);


  const handlePeriodClick = (period) => {
    setTimelineStart(period.start);
    setTimelineEnd(period.end);
    if (timelineRef.current) {
      timelineRef.current.scrollLeft = 0;
    }
  };

  const handleMouseEnter = (item, event, type) => {
    if (type === 'cluster') {
      const sortedEvents = item.events.sort((a, b) => a.year - b.year);
      setHoveredItem({ ...item, type, sortedEvents });
    } else {
      setHoveredItem({ ...item, type });
    }
    setPopupPosition({ x: event.clientX, y: event.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
  };

  const clusterEvents = useCallback((events) => {
    const sortedEvents = [...events].sort((a, b) => a.year - b.year);
    const clusters = [];
    const threshold = 10; // Threshold for clustering, adjust as needed

    for (let i = 0; i < sortedEvents.length; i++) {
      const event = sortedEvents[i];
      const position = getPosition(event.year);
      let clustered = false;

      for (let j = 0; j < clusters.length; j++) {
        if (Math.abs(clusters[j].position - position) < threshold) {
          clusters[j].events.push(event);
          clustered = true;
          break;
        }
      }

      if (!clustered) {
        clusters.push({ position, events: [event] });
      }
    }

    return clusters;
  }, [getPosition]);

  const clusteredEvents = useMemo(() => clusterEvents(filteredEvents), [filteredEvents, clusterEvents]);

  useEffect(() => {
    const resizeText = () => {
      const periodBars = document.querySelectorAll('.periodBar');
      periodBars.forEach(bar => {
        const text = bar.querySelector('.eraLabel');
        let fontSize = 14; // Starting font size
        text.style.fontSize = `${fontSize}px`;
        while (text.scrollWidth > bar.clientWidth && fontSize > 8) { // Ensure minimum font size of 8px
          fontSize -= 1;
          text.style.fontSize = `${fontSize}px`;
        }
      });
    };

    resizeText();
    window.addEventListener('resize', resizeText);
    return () => window.removeEventListener('resize', resizeText);
  }, [selectedParent, timelineStart, timelineEnd]);

  const handleZoomChange = (zoomIn) => {
    setIsAnimating(true);

    const midPoint = (timelineStart + timelineEnd) / 2;
    const currentRange = timelineEnd - timelineStart;
    let newRange = currentRange * (zoomIn ? 1/1.2 : 1.2);
    
    // Cap the new range to the total time range when zooming out
    newRange = Math.min(newRange, totalTimeRange);

    let newStart = midPoint - newRange / 2;
    let newEnd = midPoint + newRange / 2;
  
    // Ensure the new range doesn't extend beyond the total timeline
    if (newStart < totalStart) {
      newStart = totalStart;
      newEnd = newStart + newRange;
    }
  
    if (newEnd > totalEnd) {
      newEnd = totalEnd;
      newStart = newEnd - newRange;
    }
  
    setTimelineStart(newStart);
    setTimelineEnd(newEnd);

    // Update slider position
    const newSliderPosition = ((newStart - totalStart) / totalTimeRange) * 100;

    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleScroll = useCallback(() => {
    if (timelineRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = timelineRef.current;
      const visibleRatio = clientWidth / scrollWidth;
      const totalRange = 2023 - (-5000);
      
      const newStart = -5000 + (scrollLeft / scrollWidth) * totalRange;
      const newEnd = newStart + visibleRatio * totalRange;

      setTimelineStart(newStart);
      setTimelineEnd(newEnd);
    }
  }, []);


  useEffect(() => {
    const timelineElement = timelineRef.current;
    if (timelineElement) {
      timelineElement.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (timelineElement) {
        timelineElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, [handleScroll]);

  const styles = {
    container: {
      fontFamily: 'Arial, sans-serif',
      maxWidth: '1000px',
      margin: '0 auto',
      padding: '10px',
    },
    headerContainer: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '2px',
    },
    title: {
      color: '#333',
      margin: 0, // Remove default margins
      fontSize: '24px', // Adjust as needed
    },
    controls: {
      display: 'flex',
      alignItems: 'center',
    },
    zoomButton: {
      padding: '5px 5px',
      fontSize: '12px',
      cursor: 'pointer',
      width: '80px', // Fixed width for both buttons
      textAlign: 'center',
      marginLeft: '5px',
    },
    timelineContainer: {
      overflowX: 'auto',
      marginBottom: '2px',
    },
    timelineContent: {
      position: 'relative',
      width: '100%',
    },
    parentEraBar: {
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 10px',
      color: '#fff',
      fontSize: '16px',
      borderRadius: '20px',
      marginBottom: '2px',
    },
    timeline: {
      position: 'relative',
      height: '200px',
      border: '1px solid #ccc',
      margin: '2px 0',
    },
    timelineLine: {
      position: 'absolute',
      top: '50%',
      left: '0',
      right: '0',
      height: '2px',
      backgroundColor: '#333',
    },
    event: {
      position: 'absolute',
      cursor: 'pointer',
      transition: 'all 0.3s',
    },
    eventDot: {
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      backgroundColor: '#333',
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    },
    eventLabel: {
      position: 'absolute',
      width: '120px',
      fontSize: '9px',
      lineHeight: '1.2',
      textAlign: 'center',
    },
    periodBar: {
      height: '30px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 10px',
      color: '#fff',
      fontSize: '14px',
      borderRadius: '15px',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      position: 'absolute',
    },
    eraLabel: {
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    selectedEvent: {
      border: '1px solid #ccc',
      borderRadius: '5px',
      padding: '20px',
      backgroundColor: '#f9f9f9',
      marginTop: '20px',
      position: 'relative',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    selectedEventContent: {
      flex: '1 1 60%',
      paddingRight: '20px',
    },
    selectedEventTitle: {
      margin: '0 0 10px 0',
      fontSize: '18px',
      fontWeight: 'bold',
    },
    selectedEventInfo: {
      margin: '5px 0',
      fontSize: '14px',
    },
    closeButton: {
      position: 'absolute',
      top: '10px',
      right: '10px',
      cursor: 'pointer',
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#666',
      background: 'none',
      border: 'none',
      padding: '0',
      lineHeight: '1',
      zIndex: 1,
    },
    videoContainer: {
      flex: '1 1 40%',
      position: 'relative',
      paddingBottom: '22.5%', // Adjusted for 16:9 aspect ratio in a smaller size
      height: 0,
      overflow: 'hidden',
    },
    videoIframe: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      border: 'none',
    },
    clusterRectangle: {
      position: 'absolute',
      height: '20px',
      backgroundColor: 'rgba(51, 51, 51, 1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '10px',
      borderRadius: '3px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    whisker: {
      position: 'absolute',
      width: '1px',
      height: '15px',
      backgroundColor: '#333',
    },
    sliderContainer: {
    width: '100%',
    marginTop: '2px',
    position: 'relative',
    height: '30px', // Increased height
    cursor: 'pointer',
  },
  sliderTrack: {
    width: '100%',
    height: '100%', // Full height
    backgroundColor: '#d3d3d3',
    position: 'absolute',
    borderRadius: '15px', // Rounded edges
  },
  sliderHandle: {
    height: '100%',
    backgroundColor: '#555555',
    position: 'absolute',
    top: '0',
    borderRadius: '15px', // Rounded edges
    cursor: 'grab',
  },
    sliderInput: {
      width: '100%',
      height: '100%',
      opacity: 0,
      cursor: 'pointer',
      position: 'absolute',
      top: '0',
      left: '0',
    },
  };

  const parseVideoData = (videoData) => {
    if (!videoData || typeof videoData !== 'object') return null;

    const { url, startTime, endTime } = videoData;
    if (!url) return null;

    // Extract video ID from URL
    const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^&?]+)/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;

    if (!videoId) return null;

    return { videoId, startTime, endTime };
  };

  const formatVideoUrl = (videoId, startTime, endTime) => {
    let url = `https://www.youtube.com/embed/${videoId}`;
    const params = [];
    if (startTime) params.push(`start=${startTime}`);
    if (endTime) params.push(`end=${endTime}`);
    if (params.length > 0) url += '?' + params.join('&');
    return url;
  };
  
  const renderPeriods = () => {
    return currentPeriods.map((period) => {
      const widthPercentage = getPosition(period.end) - getPosition(period.start);
      const renderSubPeriods = widthPercentage > 65;

      if (renderSubPeriods) {
        const subPeriods = periods.filter(subPeriod => subPeriod.parent === period.name).sort((a, b) => a.start - b.start);
        return subPeriods.map(subPeriod => (
          <div
            key={subPeriod.name}
            className="periodBar"
            style={{
              ...styles.periodBar,
              backgroundColor: subPeriod.color,
              width: `${getPosition(subPeriod.end) - getPosition(subPeriod.start)}%`,
              left: `${getPosition(subPeriod.start)}%`,
              top: '10px',  // Ensure sub-periods are on the same line
            }}
            onMouseEnter={(e) => handleMouseEnter(subPeriod, e, 'period')}
            onMouseLeave={handleMouseLeave}
          >
            <span className="eraLabel" style={styles.eraLabel}>{subPeriod.name}</span>
          </div>
        ));
      } else {
        return (
          <div
            key={period.name}
            className="periodBar"
            style={{
              ...styles.periodBar,
              backgroundColor: period.color,
              width: `${widthPercentage}%`,
              left: `${getPosition(period.start)}%`,
              top: '10px',  // Ensure the main period is on the same line
            }}
            onClick={() => handlePeriodClick(period)}
            onMouseEnter={(e) => handleMouseEnter(period, e, 'period')}
            onMouseLeave={handleMouseLeave}
          >
            <span className="eraLabel" style={styles.eraLabel}>{period.name}</span>
          </div>
        );
      }
    });
  };
  
  const renderClusteredEvents = (clusters) => {
    let isWhiskerUp = true;
    let eventCounter = {};
    let maxZIndex = 1;

    const eventLabelStyle = {
      ...styles.eventLabel,
      backgroundColor: 'white',
      padding: '2px 5px',
      borderRadius: '3px',
      transition: 'background-color 0.3s',
      zIndex: 1,
      cursor: 'pointer',
      width: '96px',
      fontSize: '9px',
    };

    const handleLabelHover = (e) => {
      maxZIndex += 1;
      e.currentTarget.style.zIndex = maxZIndex;
    };

    return clusters.flatMap((cluster, index) => {
      if (cluster.events.length === 1) {
        // Single event
        const event = cluster.events[0];
        eventCounter[event.year] = (eventCounter[event.year] || 0) + 1;
        const uniqueKey = `event-${event.id || `${event.year}-${event.event.replace(/\s+/g, '-')}`}`;
        const isSelected = uniqueKey === selectedEventId;
        
        console.log(`Event: ${event.event}, isSelected: ${isSelected}, uniqueKey: ${uniqueKey}, selectedEventId: ${selectedEventId}`);
      
  
        return (
          <div
            key={uniqueKey}
            className="event"
            style={{
              ...styles.event,
              left: `${cluster.position}%`,
              top: '50%',
              transform: 'translateY(-50%)',
              transition: isAnimating ? 'left 0.3s ease-in-out' : 'none',
            }}
          >
            <div style={styles.eventDot} />
            <div
              style={{
                ...styles.whisker,
                left: '50%',
                transform: 'translateX(-50%)',
                top: isWhiskerUp ? '-22px' : '0',
                height: '22px',
              }}
            />
            <div
              style={{
    ...eventLabelStyle,
    top: isWhiskerUp ? '-52px' : '30px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: isSelected ? 'yellow' : 'white',
    border: isSelected ? '2px solid red' : 'none',
    fontWeight: isSelected ? 'bold' : 'normal',
  }}
              onClick={() => handleEventClick(event)}
              onMouseEnter={(e) => { handleMouseEnter(event, e, 'event'); handleLabelHover(e); }}
              onMouseLeave={handleMouseLeave}
            >
              {formatYear(event.year)}: {event.event}
            </div>
          </div>
        );
      } else if (cluster.events.length <= 4) {
        // Small cluster (2-4 events)
        const midPoint = Math.ceil(cluster.events.length / 2);
        return (
          <div
            key={`cluster-${index}`}
            className="event"
            style={{
              ...styles.event,
              left: `${cluster.position}%`,
              top: '50%',
              transform: 'translateY(-50%)',
              transition: isAnimating ? 'left 0.3s ease-in-out' : 'none',
            }}
          >
            <div style={styles.eventDot} />
            <div
              style={{
                ...styles.whisker,
                left: '50%',
                transform: 'translateX(-50%)',
                top: '-22px', // Midway between -20px and -25px
                height: '22px', // Midway between 20px and 25px
              }}
            />
            <div
              style={{
                ...styles.whisker,
                left: '50%',
                transform: 'translateX(-50%)',
                bottom: '-22px', // Midway between -20px and -25px
                height: '22px', // Midway between 20px and 25px
              }}
            />
            <div
              style={{
                ...eventLabelStyle,
                top: '-85px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: 'auto',
              }}
            >
              {cluster.events.slice(0, midPoint).map((event, eventIndex) => {
                eventCounter[event.year] = (eventCounter[event.year] || 0) + 1;
                const uniqueKey = `event-${event.id || `${event.year}-${event.event.replace(/\s+/g, '-')}`}`;
                const isSelected = uniqueKey === selectedEventId;
                return (
                  <div
                    key={uniqueKey}
                    style={{
                      marginBottom: '3px',
                      padding: '1px 3px',
                      width: '96px',
                      backgroundColor: isSelected ? '#ffeeee' : 'white',
                      border: isSelected ? '1px solid #ff0000' : 'none',
                    }}
                    onClick={() => handleEventClick(event)}
                    onMouseEnter={(e) => { handleMouseEnter(event, e, 'event'); handleLabelHover(e); }}
                    onMouseLeave={handleMouseLeave}
                  >
                    {formatYear(event.year)}: {event.event}
                  </div>
                );
              })}
            </div>
            <div
              style={{
                ...eventLabelStyle,
                bottom: '-75px', // Midway between -65px and -85px
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: 'auto', // Allow auto width for multiple events
              }}
            >
              {cluster.events.slice(midPoint).map((event, eventIndex) => {
                eventCounter[event.year] = (eventCounter[event.year] || 0) + 1;
                const uniqueKey = `event-${event.year}-${eventCounter[event.year]}`;
                return (
                  <div
                    key={uniqueKey}
                    style={{marginBottom: '3px', padding: '1px 3px', width: '96px'}} // Midway between 2px and 4px
                    onClick={() => handleEventClick(event)}
                    onMouseEnter={(e) => { handleMouseEnter(event, e, 'event'); handleLabelHover(e); }}
                    onMouseLeave={handleMouseLeave}
                  >
                    {formatYear(event.year)}: {event.event}
                  </div>
                );
              })}
            </div>
          </div>
        );
      } else {
        // Large cluster (more than 4 events)
        
        const earliestEvent = cluster.events.reduce((min, event) => event.year < min.year ? event : min);
        const latestEvent = cluster.events.reduce((max, event) => event.year > max.year ? event : max);

        const earliestKey = `event-${earliestEvent.id || `${earliestEvent.year}-${earliestEvent.event.replace(/\s+/g, '-')}`}`;
        const isEarliestSelected = earliestKey === selectedEventId;

        const startPosition = getPosition(earliestEvent.year);
        const endPosition = getPosition(latestEvent.year);
        const width = endPosition - startPosition;
        

        const handleRectangleClick = () => {
          setTimelineStart(earliestEvent.year);
          setTimelineEnd(latestEvent.year);
        };

        return (
          <div
            key={`cluster-${index}`}
            className="event"
            style={{
              ...styles.event,
              left: `${startPosition}%`,
              top: '50%',
              width: `${width}%`,
              transform: 'translateY(-50%)',
              transition: isAnimating ? 'left 0.3s ease-in-out, width 0.3s ease-in-out' : 'none',
            }}
          >
            <div
              style={{
                ...styles.clusterRectangle,
                width: '100%',
                top: '50%',
                transform: 'translateY(-50%)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => handleMouseEnter({ events: cluster.events }, e, 'cluster')}
              onMouseLeave={handleMouseLeave}
              onClick={handleRectangleClick}
            >
              {cluster.events.length} events
            </div>
            {/* Start whisker */}
            <div
              style={{
                ...styles.whisker,
                left: 0,
                top: isWhiskerUp ? '-27px' : '12px',
              }}
            />
            {/* Start label */}
            <div
              style={{
                ...eventLabelStyle,
                top: isWhiskerUp ? '-55px' : '37px',
                left: 0,
                transform: 'translateX(-50%)',
                backgroundColor: isEarliestSelected ? '#ffeeee' : 'white',
                border: isEarliestSelected ? '1px solid #ff0000' : 'none',
              }}
              onClick={() => handleEventClick(earliestEvent)}
              onMouseEnter={(e) => { handleMouseEnter(earliestEvent, e, 'event'); handleLabelHover(e); }}
              onMouseLeave={handleMouseLeave}
            >
              {formatYear(earliestEvent.year)}: {earliestEvent.event}
            </div>

            {/* End whisker */}
            <div
              style={{
                ...styles.whisker,
                right: 0,
                top: !isWhiskerUp ? '-27px' : '12px',
              }}
            />
            {/* End label */}
            <div
              style={{
                ...eventLabelStyle,
                top: !isWhiskerUp ? '-55px' : '37px',
                right: 0,
                transform: 'translateX(50%)',
              }}
              onClick={() => handleEventClick(latestEvent)}
              onMouseEnter={(e) => { handleMouseEnter(latestEvent, e, 'event'); handleLabelHover(e); }}
              onMouseLeave={handleMouseLeave}
            >
              {formatYear(latestEvent.year)}: {latestEvent.event}
            </div>
          </div>
        );
      }
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerContainer}>
        <h1 style={styles.title}>Interactive Timeline</h1>
        <div style={styles.controls}>
          <button style={styles.zoomButton} onClick={() => handleZoomChange(true)}>Zoom In</button>
          <button style={styles.zoomButton} onClick={() => handleZoomChange(false)}>Zoom Out</button>
        </div>
      </div>

      <div style={styles.timelineContainer} ref={timelineRef}>
      <div style={styles.timelineContent}>
        
        {selectedParent && (
          <div
            className="periodBar"
            style={{
              ...styles.parentEraBar,
              backgroundColor: periods.find(period => period.name === selectedParent)?.color,
              width: '100%',
            }}
            onMouseEnter={(e) => handleMouseEnter(periods.find(period => period.name === selectedParent), e, 'period')}
            onMouseLeave={handleMouseLeave}
          >
            <span className="eraLabel" style={styles.eraLabel}>{selectedParent}</span>
          </div>
        )}
        
        <div style={{ position: 'relative', height: '50px', marginBottom: '2px' }}>
          {renderPeriods()}
        </div>

        <div style={styles.timeline}>
          <div style={styles.timelineLine}></div>
          {renderClusteredEvents(clusteredEvents)}
        </div>
      </div>
    </div>

    <div 
        style={styles.sliderContainer} 
        ref={sliderRef}
        onMouseDown={handleMouseDown}
      >
        <div style={styles.sliderTrack}>
          <div 
            style={{
              ...styles.sliderHandle,
              left: `${sliderPosition}%`,
              width: `${handleWidth}%`
            }}
          />
        </div>
      </div>
      

    
      {selectedEvent && (
        <div style={styles.selectedEvent}>
          <button 
            style={styles.closeButton} 
            onClick={handleCloseEventCard}
            aria-label="Close"
          >
            ×
          </button>
          <div style={styles.selectedEventContent}>
            <h3 style={styles.selectedEventTitle}>
              {selectedEvent.event || selectedEvent.name || 'Unknown Event'}
            </h3>
            <p style={styles.selectedEventInfo}>
              <strong>Year:</strong> {formatYear(selectedEvent.year)}
            </p>
            <p style={styles.selectedEventInfo}>
              <strong>Era:</strong> {selectedEvent.era || 'Unknown Era'}
            </p>
            <p style={styles.selectedEventInfo}>
              <strong>Description:</strong> {selectedEvent.description || selectedEvent.explanation || 'No description available'}
            </p>
            {selectedEvent.impact && (
              <p style={styles.selectedEventInfo}>
                <strong>Impact:</strong> {selectedEvent.impact}
              </p>
            )}
          </div>
          {selectedEvent.videoData && (
            <div style={styles.videoContainer}>
              {(() => {
                const parsedVideoData = parseVideoData(selectedEvent.videoData);
                if (!parsedVideoData) return null;
                const { videoId, startTime, endTime } = parsedVideoData;
                return (
                  <iframe
                    style={styles.videoIframe}
                    src={formatVideoUrl(videoId, startTime, endTime)}
                    title="YouTube video player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {hoveredItem && <Popup content={hoveredItem} position={popupPosition} type={hoveredItem.type} />}
    </div>
  );
};

export default MultiLevelHierarchicalTimeline;