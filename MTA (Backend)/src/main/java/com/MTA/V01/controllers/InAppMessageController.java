package com.MTA.V01.controllers;

import com.MTA.V01.services.controllers.MessageServices;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/messages")
@CrossOrigin(origins = {"https://meditracker.fit","http://meditracker.fit", "smrtnmedi.netlify.app","https://www.meditracker.fit","http://meditracker.fit"},maxAge = 3600)
public class InAppMessageController {
    @Autowired
    MessageServices messageServices;

    @GetMapping("/getmessages")
    public ResponseEntity<?> getMessages(){
        return messageServices.getMessages();
    }

    @GetMapping("/getunread")
    public ResponseEntity<?> getUnreadMessages(){
        return messageServices.getUnreadMessages();
    }

    @GetMapping("/markasread/{messageId}")
    public ResponseEntity<?> markAsRead(@PathVariable("messageId") Long id){
        return messageServices.markMessageAsRead(id);
    }
}
