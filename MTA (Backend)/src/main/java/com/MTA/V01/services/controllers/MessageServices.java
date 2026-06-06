package com.MTA.V01.services.controllers;

import com.MTA.V01.models.InAppMessage;
import com.MTA.V01.repositories.InAppMessagesRepository;
import com.MTA.V01.services.general.GeneralServices;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

@Service
public class MessageServices {
    @Autowired
    InAppMessagesRepository inAppMessagesRepository;

    @Autowired
    GeneralServices generalServices;

    public ResponseEntity<?> getMessages(){
        if (inAppMessagesRepository.findByUser(generalServices.getSelf()).isEmpty()){
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(inAppMessagesRepository.findByUser(generalServices.getSelf()));
    }

    public ResponseEntity<?> getUnreadMessages(){
        if (inAppMessagesRepository.findByUserAndIsReadFalse(generalServices.getSelf()).isEmpty()){
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(inAppMessagesRepository.findByUserAndIsReadFalse(generalServices.getSelf()));
    }

    public ResponseEntity<?> markMessageAsRead(Long messageId){
        if (!inAppMessagesRepository.existsById(messageId)){
            return ResponseEntity.badRequest().body("message with id "+messageId+" doesn't exist");
        }
        if (!inAppMessagesRepository.findById(messageId).get().getUser().equals(generalServices.getSelf())){
            return ResponseEntity.badRequest().body("not authorized to read this message");
        }
        InAppMessage temp = inAppMessagesRepository.findById(messageId).get();
        temp.setRead(true);
        inAppMessagesRepository.save(temp);
        return ResponseEntity.ok("message read successfully");
    }
}
