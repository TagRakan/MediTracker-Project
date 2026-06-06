package com.MTA.V01.controllers;

import com.MTA.V01.services.controllers.PastDoseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pastdoses")
@CrossOrigin(origins = {"https://meditracker.fit","http://meditracker.fit", "smrtnmedi.netlify.app","https://www.meditracker.fit","http://meditracker.fit"},maxAge = 3600)
public class PastDoseController {
    @Autowired
    PastDoseService pastDoseService;

    @GetMapping("/self")
    public ResponseEntity<?> getSelfPastDoses(){
        return pastDoseService.getSelfPastDoses();
    }

    @GetMapping("/user/{userid}")
    public ResponseEntity<?> getUserPastDoses(@PathVariable("userid") Long id){
        return pastDoseService.getUserPastDoses(id);
    }
}
