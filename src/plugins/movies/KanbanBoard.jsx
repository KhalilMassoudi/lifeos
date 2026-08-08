import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import MediaCard from './MediaCard';
import { MEDIA_STATUS, useMediaStore } from './mediaStore';

const COLUMNS = [
  { id: MEDIA_STATUS.WANT_TO_WATCH, title: 'Want to Watch', color: 'border-slate-500/30 text-slate-400' },
  { id: MEDIA_STATUS.WATCHING, title: 'Watching', color: 'border-blue-500/30 text-blue-400' },
  { id: MEDIA_STATUS.COMPLETED, title: 'Completed', color: 'border-sage-400/30 text-sage-400' },
  { id: MEDIA_STATUS.DROPPED, title: 'Dropped', color: 'border-red-400/30 text-red-400' },
];

export default function KanbanBoard({ type }) {
  const { getItemsByType, updateItem } = useMediaStore();
  const items = getItemsByType(type);

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    // Dropped outside a valid column or in the same place
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const targetStatus = destination.droppableId;
    
    try {
      await updateItem(draggableId, { status: targetStatus });
    } catch (err) {
      console.error("Drag and drop status update failed:", err);
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex-1 overflow-x-auto overflow-y-hidden pt-4 pb-2">
        <div className="flex gap-4 h-full min-w-max px-6">
          {COLUMNS.map(col => {
            const colItems = items.filter(i => i.status === col.id);
            
            return (
              <div 
                key={col.id}
                className="flex flex-col w-72 bg-navy-900/50 rounded-2xl border border-white/5 overflow-hidden"
              >
                {/* Header */}
                <div className={`p-4 border-b ${col.color} bg-navy-900 flex items-center justify-between`}>
                  <h3 className="font-medium text-sm">{col.title}</h3>
                  <span className="text-xs font-medium bg-navy-800 px-2 py-0.5 rounded-full text-slate-500">
                    {colItems.length}
                  </span>
                </div>
                
                {/* Droppable Column */}
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 overflow-y-auto p-3 flex flex-col gap-3 custom-scrollbar transition-all duration-200 ${
                        snapshot.isDraggingOver ? 'bg-white/5 border-x border-b border-gold-400/10 rounded-b-2xl' : ''
                      }`}
                    >
                      {colItems.map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                ...provided.draggableProps.style,
                                transform: snapshot.isDragging 
                                  ? `${provided.draggableProps.style?.transform} scale(1.03)` 
                                  : provided.draggableProps.style?.transform,
                                transition: snapshot.isDragging 
                                  ? 'transform 0.1s ease-out' 
                                  : provided.draggableProps.style?.transition
                              }}
                              className="focus:outline-none"
                            >
                              <MediaCard item={item} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      
                      {colItems.length === 0 && (
                        <div className="flex-1 min-h-[150px] flex items-center justify-center text-xs text-slate-600 font-medium border-2 border-dashed border-white/5 rounded-xl">
                          Drop items here
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </div>
    </DragDropContext>
  );
}
