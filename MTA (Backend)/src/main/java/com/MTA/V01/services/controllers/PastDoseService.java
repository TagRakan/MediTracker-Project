package com.MTA.V01.services.controllers;

import com.MTA.V01.models.User;
import com.MTA.V01.repositories.PastDosesRepository;
import com.MTA.V01.repositories.UserRepository;
import com.MTA.V01.services.general.GeneralServices;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

@Service
public class PastDoseService {
    @Autowired
    PastDosesRepository pastDosesRepository;

    @Autowired
    GeneralServices generalServices;

    @Autowired
    UserRepository userRepository;

    public ResponseEntity<?> getSelfPastDoses(){
        if (generalServices.getSelf().getPastDoses().isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(generalServices.getSelf().getPastDoses());
    }

    public ResponseEntity<?> getUserPastDoses(Long id){
        User user = generalServices.getUser(id);
        if (user.getFamily().contains(generalServices.getSelf()) || user.getDoctors().contains(generalServices.getSelf())){
            return ResponseEntity.ok(user.getPastDoses());
        }
        return ResponseEntity.badRequest().body("user is not in family or patients");
    }

}
